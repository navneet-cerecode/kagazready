import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  BEDROCK_LIMITS,
  BedrockExplanationResponseSchema,
  type Language,
} from '@kagazready/contracts';
import { config } from '../config.js';
import { log } from '../http.js';

/**
 * Amazon Bedrock adapter — the only part of the product that uses a language model.
 *
 * What it does: takes findings this service has already decided, and asks for a one-sentence
 * plain-language restatement of each, in the user's language.
 *
 * What it cannot do: change a status, add a finding, or alter a value. The caller matches every
 * returned explanation back to a finding it sent, discards anything unrecognised, and validates the
 * text against a schema that rejects decision words. A failure here is invisible to the user apart
 * from one paragraph reverting to reviewed English copy.
 *
 * Every value in the prompt is already masked by the rule engine. No raw OCR text is sent.
 */

let client: BedrockRuntimeClient | undefined;
const bedrock = (): BedrockRuntimeClient =>
  (client ??= new BedrockRuntimeClient({ region: config().bedrockRegion }));

/** Test seam. */
export function setBedrockClient(next: BedrockRuntimeClient | undefined): void {
  client = next;
}

export interface ExplanationRequestItem {
  findingId: string;
  /** Already-rendered English title, reason and action. Masked. */
  title: string;
  reason: string;
  suggestedAction: string;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
};

const SYSTEM_PROMPT = [
  'You rewrite document-checklist notes for Indian students in simple, calm language.',
  '',
  'Each note describes something to check on a scholarship document. The decision has already been',
  'made by a rule engine before you see it. Your only job is to restate the note so it is easier to',
  'understand.',
  '',
  'Rules you must follow:',
  '- Write exactly one short sentence per note, at most 30 words.',
  '- Do not decide, imply, or predict whether an application will succeed. Never use words like',
  '  approved, eligible, verified, guaranteed or rejected.',
  '- Do not say whether a document is genuine or fake.',
  '- Do not add any requirement, fact, number, name, or date that is not already in the note.',
  '- Do not change any value shown in the note. Values containing X are masked; keep them masked.',
  '- Reply with JSON only, no code fences and no commentary.',
].join('\n');

function buildUserPrompt(items: ExplanationRequestItem[], language: Language): string {
  return [
    `Write each explanation in ${LANGUAGE_NAMES[language]}.`,
    '',
    'Reply with exactly this JSON shape:',
    '{"explanations":[{"findingId":"<id>","explanation":"<one sentence>"}]}',
    '',
    'Notes to restate:',
    JSON.stringify(items),
  ].join('\n');
}

/** Strip a code fence if the model added one despite being told not to. */
function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  return start !== -1 && end > start ? candidate.slice(start, end + 1) : candidate;
}

/**
 * Ask Bedrock for explanations.
 *
 * Returns a map from finding id to explanation text, containing only entries that matched a
 * requested finding and passed schema validation. Returns an empty map on any failure — the caller
 * treats a missing entry as "use the reviewed English fallback", so partial success is fine.
 */
export async function explainFindings(
  items: ExplanationRequestItem[],
  language: Language,
): Promise<Record<string, string>> {
  const { bedrockModelId } = config();
  if (!bedrockModelId || items.length === 0) return {};

  const requested = items.slice(0, BEDROCK_LIMITS.maxFindingsPerCall);
  const allowedIds = new Set(requested.map((item) => item.findingId));
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), BEDROCK_LIMITS.timeoutMs);

  try {
    const response = await bedrock().send(
      new ConverseCommand({
        modelId: bedrockModelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [{ role: 'user', content: [{ text: buildUserPrompt(requested, language) }] }],
        inferenceConfig: {
          maxTokens: BEDROCK_LIMITS.maxOutputTokens,
          temperature: 0,
        },
      }),
      { abortSignal: abort.signal },
    );

    const text = (response.output?.message?.content ?? [])
      .map((block) => ('text' in block ? block.text : ''))
      .join('')
      .trim();

    if (text === '') {
      log('warn', 'bedrock returned no text', { language });
      return {};
    }

    let raw: unknown;
    try {
      raw = JSON.parse(extractJson(text));
    } catch {
      log('warn', 'bedrock output was not valid JSON', { language });
      return {};
    }

    const parsed = BedrockExplanationResponseSchema.safeParse(raw);
    if (!parsed.success) {
      log('warn', 'bedrock output failed schema validation', {
        language,
        issue: parsed.error.issues[0]?.message,
      });
      return {};
    }

    const explanations: Record<string, string> = {};
    for (const item of parsed.data.explanations) {
      // A finding id the caller never sent would mean the model invented a finding. Drop it.
      if (allowedIds.has(item.findingId)) explanations[item.findingId] = item.explanation;
    }

    log('info', 'bedrock explanations accepted', {
      language,
      requested: requested.length,
      accepted: Object.keys(explanations).length,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    });

    return explanations;
  } catch (error) {
    log('warn', 'bedrock call failed; using reviewed fallback copy', {
      language,
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    return {};
  } finally {
    clearTimeout(timer);
  }
}
