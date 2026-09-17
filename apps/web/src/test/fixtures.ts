import {
  SCHOLARSHIP_READINESS_TEMPLATE,
  type AnalysisResponse,
  type Language,
  type PresentedFinding,
} from '@kagazready/contracts';
import { analyze, fallbackExplanation, renderFinding } from '@kagazready/rules';
import { scenarioANeedsReview, scenarioBNoIssues } from '@kagazready/rules/testing';

/**
 * API responses for frontend tests, built from the real rule engine rather than typed by hand, so
 * the interface is tested against the findings the product actually produces.
 */

export const ANALYSIS_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

const NOW = new Date('2026-09-18T10:00:00Z');

function present(
  documents: ReturnType<typeof scenarioANeedsReview>,
  language: Language,
  explanation: 'bedrock' | 'fallback' | 'none' = 'fallback',
): AnalysisResponse {
  const outcome = analyze({ documents, template: SCHOLARSHIP_READINESS_TEMPLATE, now: NOW });

  const findings: PresentedFinding[] = outcome.findings.map((finding) => ({
    ...finding,
    text: renderFinding(finding, language),
    explanation:
      explanation === 'none'
        ? null
        : explanation === 'bedrock'
          ? {
              text: `Model note for ${finding.ruleId}`,
              language,
              source: 'bedrock',
              translationUnavailable: false,
            }
          : {
              text: fallbackExplanation(finding.ruleId),
              language: 'en',
              source: 'fallback',
              translationUnavailable: language !== 'en',
            },
  }));

  return {
    analysisId: ANALYSIS_ID,
    templateId: SCHOLARSHIP_READINESS_TEMPLATE.id,
    templateVersion: SCHOLARSHIP_READINESS_TEMPLATE.version,
    language,
    status: outcome.overallStatus,
    findings,
    readings: outcome.readings,
    missingDocumentTypes: outcome.missingDocumentTypes,
    documentTypesPresent: outcome.readings.map((r) => r.documentType),
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 6 * 3600 * 1000).toISOString(),
    explanationsDegraded: explanation === 'fallback',
  };
}

export const needsReview = (
  language: Language = 'en',
  explanation?: 'bedrock' | 'fallback' | 'none',
) => present(scenarioANeedsReview(), language, explanation);

export const noIssues = (language: Language = 'en') => present(scenarioBNoIssues(), language);

export const incomplete = (language: Language = 'en') =>
  present([scenarioBNoIssues()[0]!], language);

export function pngFile(name = 'marksheet.png', bytes = 50_000): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}
