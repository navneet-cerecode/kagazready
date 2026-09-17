import { z } from 'zod';

/**
 * Schema for Bedrock output.
 *
 * Bedrock is only ever asked to restate an already-decided finding in simpler words, in the
 * requested language. It has no authority over status. Anything that fails this schema is discarded
 * and the reviewed fallback explanation is used instead.
 */

/**
 * Words a readiness explanation must never contain, in any of the three languages. If the model
 * produces one, it has drifted into judging the application, so the output is rejected outright.
 */
export const FORBIDDEN_EXPLANATION_TERMS = [
  // English
  'approved',
  'approval',
  'eligible',
  'eligibility',
  'verified',
  'verification complete',
  'guaranteed',
  'guarantee',
  'rejected',
  'rejection',
  'authentic',
  'genuine',
  'fraud',
  'fake',
  // Hindi
  'स्वीकृत',
  'पात्र',
  'सत्यापित',
  'गारंटी',
  'अस्वीकृत',
  // Gujarati
  'મંજૂર',
  'પાત્ર',
  'ચકાસાયેલ',
  'ગેરંટી',
  'નામંજૂર',
] as const;

const MAX_EXPLANATION_CHARS = 320;

const explanationText = z
  .string()
  .trim()
  .min(1)
  .max(MAX_EXPLANATION_CHARS)
  .refine(
    (value) => {
      const haystack = value.toLowerCase();
      return !FORBIDDEN_EXPLANATION_TERMS.some((term) => haystack.includes(term.toLowerCase()));
    },
    { message: 'explanation contains a term that implies an application decision' },
  );

export const BedrockExplanationItemSchema = z.object({
  /** Must match a finding id that was sent in the prompt. Checked by the caller as well. */
  findingId: z.string().min(1),
  explanation: explanationText,
});
export type BedrockExplanationItem = z.infer<typeof BedrockExplanationItemSchema>;

export const BedrockExplanationResponseSchema = z.object({
  explanations: z.array(BedrockExplanationItemSchema).max(20),
});
export type BedrockExplanationResponse = z.infer<typeof BedrockExplanationResponseSchema>;

export const BEDROCK_LIMITS = {
  /** Hard cap on output tokens per call, to bound cost. */
  maxOutputTokens: 700,
  /** Findings sent per call. Beyond this, the rest use fallback copy. */
  maxFindingsPerCall: 8,
  /** Wall-clock budget; on timeout the deterministic result is returned with fallback copy. */
  timeoutMs: 6000,
} as const;
