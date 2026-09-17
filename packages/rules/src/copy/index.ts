import {
  DOCUMENT_TYPES,
  FIELD_IDS,
  type DocumentType,
  type FieldId,
  type Finding,
  type FindingText,
  type Language,
  type OverallStatus,
  type RuleId,
} from '@kagazready/contracts';
import { EN, FALLBACK_EXPLANATIONS_EN } from './en.js';
import { GU } from './gu.js';
import { HI } from './hi.js';
import type { LanguageCopy, StatusCopy } from './types.js';

export type { LanguageCopy, RuleCopy, StatusCopy } from './types.js';
export { EN, FALLBACK_EXPLANATIONS_EN } from './en.js';
export { HI } from './hi.js';
export { GU } from './gu.js';

const COPY: Record<Language, LanguageCopy> = { en: EN, hi: HI, gu: GU };

export function copyFor(language: Language): LanguageCopy {
  return COPY[language];
}

const isDocumentType = (value: string): value is DocumentType =>
  (DOCUMENT_TYPES as readonly string[]).includes(value);

const isFieldId = (value: string): value is FieldId =>
  (FIELD_IDS as readonly string[]).includes(value);

/** "a", "a and b", "a, b and c" — with the separators of the target language. */
function formatList(items: string[], copy: LanguageCopy): string {
  if (items.length <= 1) return items[0] ?? '';
  const head = items.slice(0, -1).join(copy.listSeparator);
  return `${head}${copy.listConjunction}${items[items.length - 1]}`;
}

function localizeDocumentList(csv: string, copy: LanguageCopy): string {
  const labels = csv
    .split(',')
    .map((value) => value.trim())
    .filter(isDocumentType)
    .map((documentType) => copy.documentTypes[documentType]);
  return formatList(labels, copy);
}

const PLACEHOLDER = /\{(\w+)\}/gu;

/**
 * Substitute `{placeholders}` in reviewed copy.
 *
 * Document types and field ids are replaced with their label in the target language, so a finding
 * reads naturally in Hindi or Gujarati without the rule engine knowing anything about language.
 * Unknown placeholders are left as-is rather than silently blanked, so a copy mistake is visible in
 * tests instead of hidden from the user.
 */
function interpolate(template: string, params: Record<string, string>, copy: LanguageCopy): string {
  return template.replace(PLACEHOLDER, (whole, key: string) => {
    const value = params[key];
    if (value === undefined) return whole;

    if (key === 'documentType' && isDocumentType(value)) return copy.documentTypes[value];
    if (key === 'fieldId' && isFieldId(value)) return copy.fields[value];
    if (key === 'outlierDocumentTypes' || key === 'referenceDocumentTypes') {
      return localizeDocumentList(value, copy);
    }
    return value;
  });
}

/** Resolve a deterministic finding into reviewed, human-readable text. No AI involved. */
export function renderFinding(finding: Finding, language: Language): FindingText {
  const copy = copyFor(language);
  const rule = copy.rules[finding.ruleId];
  return {
    title: interpolate(rule.title, finding.params, copy),
    reason: interpolate(rule.reason, finding.params, copy),
    suggestedAction: interpolate(rule.suggestedAction, finding.params, copy),
  };
}

export function statusCopy(status: OverallStatus, language: Language): StatusCopy {
  return copyFor(language).statuses[status];
}

export function documentTypeLabel(documentType: DocumentType, language: Language): string {
  return copyFor(language).documentTypes[documentType];
}

export function fieldLabel(fieldId: FieldId, language: Language): string {
  return copyFor(language).fields[fieldId];
}

/**
 * The reviewed English explanation for a rule, used when Bedrock cannot supply one. English only,
 * by design — see the note in `en.ts`.
 */
export function fallbackExplanation(ruleId: RuleId): string {
  return FALLBACK_EXPLANATIONS_EN[ruleId];
}
