import type { AnalysisResponse, Language, PresentedFinding } from '@kagazready/contracts';
import { fallbackExplanation, renderFinding } from '@kagazready/rules';
import { explainFindings, type ExplanationRequestItem } from './adapters/bedrock.js';
import type { StoredAnalysis, StoredExplanation } from './adapters/store.js';

/**
 * Turns a stored analysis into the response the frontend renders.
 *
 * The deterministic part — statuses, findings, evidence — is presented exactly as the rule engine
 * decided it, with reviewed copy resolved into the requested language. The optional part is the
 * plain-language explanation, which comes from Bedrock when it can and from reviewed English copy
 * when it cannot.
 */

export interface PresentedAnalysis {
  response: AnalysisResponse;
  /** Set when explanations were generated in this call and should be cached. */
  generatedExplanations?: Record<string, StoredExplanation>;
}

async function resolveExplanations(
  stored: StoredAnalysis,
  language: Language,
): Promise<{ explanations: Record<string, StoredExplanation>; generated: boolean }> {
  const findings = stored.outcome?.findings ?? [];
  if (findings.length === 0) return { explanations: {}, generated: false };

  const cached = stored.explanations?.[language];
  if (cached && findings.every((finding) => cached[finding.id] !== undefined)) {
    return { explanations: cached, generated: false };
  }

  // English text is what Bedrock is asked to restate: it is reviewed, masked, and stable.
  const items: ExplanationRequestItem[] = findings.map((finding) => {
    const english = renderFinding(finding, 'en');
    return {
      findingId: finding.id,
      title: english.title,
      reason: english.reason,
      suggestedAction: english.suggestedAction,
    };
  });

  const fromBedrock = await explainFindings(items, language);

  const explanations: Record<string, StoredExplanation> = {};
  for (const finding of findings) {
    const generated = fromBedrock[finding.id];
    explanations[finding.id] = generated
      ? { text: generated, source: 'bedrock' }
      : { text: fallbackExplanation(finding.ruleId), source: 'fallback' };
  }

  return { explanations, generated: true };
}

export async function presentAnalysis(
  stored: StoredAnalysis,
  language: Language,
): Promise<PresentedAnalysis> {
  const outcome = stored.outcome;
  if (!outcome) throw new Error('presentAnalysis called before the analysis completed');

  const { explanations, generated } = await resolveExplanations(stored, language);

  const findings: PresentedFinding[] = outcome.findings.map((finding) => {
    const stored = explanations[finding.id];
    return {
      ...finding,
      text: renderFinding(finding, language),
      explanation: stored
        ? {
            text: stored.text,
            // A fallback explanation is English, whatever language was asked for.
            language: stored.source === 'fallback' ? 'en' : language,
            source: stored.source,
            translationUnavailable: stored.source === 'fallback' && language !== 'en',
          }
        : null,
    };
  });

  const response: AnalysisResponse = {
    analysisId: stored.analysisId,
    templateId: stored.templateId,
    templateVersion: stored.templateVersion,
    language,
    status: outcome.overallStatus,
    findings,
    readings: outcome.readings,
    missingDocumentTypes: outcome.missingDocumentTypes,
    documentTypesPresent: outcome.readings.map((reading) => reading.documentType),
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    expiresAt: new Date(stored.expiresAt * 1000).toISOString(),
    explanationsDegraded: findings.some((finding) => finding.explanation?.source === 'fallback'),
  };

  return generated ? { response, generatedExplanations: explanations } : { response };
}
