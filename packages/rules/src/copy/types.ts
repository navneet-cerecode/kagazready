import type { DocumentType, FieldId, OverallStatus, RuleId } from '@kagazready/contracts';

/**
 * Reviewed, human-written interface copy.
 *
 * This is deliberately static data, not AI output. Every finding is fully renderable in English,
 * Hindi, and Gujarati with no model involved, so a Bedrock outage degrades one optional paragraph
 * rather than the product.
 *
 * Placeholders are `{name}` and are substituted by `renderFinding`. `{documentType}`, `{fieldId}`,
 * `{outlierDocumentTypes}` and `{referenceDocumentTypes}` are replaced with the localized label for
 * that document or field; every other placeholder is substituted literally.
 */
export interface RuleCopy {
  title: string;
  reason: string;
  suggestedAction: string;
}

export interface StatusCopy {
  label: string;
  summary: string;
}

export interface LanguageCopy {
  documentTypes: Record<DocumentType, string>;
  fields: Record<FieldId, string>;
  statuses: Record<OverallStatus, StatusCopy>;
  rules: Record<RuleId, RuleCopy>;
  /** Joins a list of document labels, e.g. " and " in English. */
  listConjunction: string;
  listSeparator: string;
}
