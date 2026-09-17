import { z } from 'zod';

/** The three document types this readiness template covers. */
export const DOCUMENT_TYPES = ['class_xii_marksheet', 'income_certificate', 'bank_proof'] as const;
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

/** Interface languages. */
export const LANGUAGES = ['en', 'hi', 'gu'] as const;
export const LanguageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof LanguageSchema>;

/**
 * Overall readiness status. These three values are the only ones that exist.
 *
 * Deliberately absent: approved, eligible, verified, guaranteed, rejected. KagazReady reviews
 * document readiness; it does not judge applications.
 */
export const OVERALL_STATUSES = ['incomplete', 'needs_review', 'no_issues_found'] as const;
export const OverallStatusSchema = z.enum(OVERALL_STATUSES);
export type OverallStatus = z.infer<typeof OverallStatusSchema>;

/**
 * Per-finding status.
 * - `missing`: something required is absent, so the set cannot be submitted as-is.
 * - `needs_review`: present but inconsistent, unclear, or ambiguous; a human must look.
 */
export const FINDING_STATUSES = ['missing', 'needs_review'] as const;
export const FindingStatusSchema = z.enum(FINDING_STATUSES);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

/** Every field the template can look for, across all three document types. */
export const FIELD_IDS = [
  'marksheet_candidate_name',
  'marksheet_board',
  'marksheet_exam_year',
  'marksheet_roll_number',
  'income_applicant_name',
  'income_annual_income',
  'income_issue_date',
  'income_issuing_authority',
  'bank_account_holder_name',
  'bank_account_number',
  'bank_ifsc',
  'bank_name',
] as const;
export const FieldIdSchema = z.enum(FIELD_IDS);
export type FieldId = z.infer<typeof FieldIdSchema>;

/**
 * Rule identifiers. Every finding carries one so a user can be told exactly which check fired,
 * and so the UI can look up reviewed copy in each language.
 */
export const RULE_IDS = [
  'required_document_missing',
  'required_field_missing',
  'field_unclear_low_confidence',
  'name_minor_difference',
  'name_material_difference',
  'bank_ifsc_invalid_format',
  'bank_account_number_implausible',
  'date_ambiguous',
  'date_in_future',
  'date_unparseable',
] as const;
export const RuleIdSchema = z.enum(RULE_IDS);
export type RuleId = z.infer<typeof RuleIdSchema>;

/**
 * A single piece of supporting evidence for a finding: what was read, from which document, and how
 * confident the OCR was. `value` is always display-safe — bank account numbers arrive here masked.
 */
export const EvidenceSchema = z.object({
  documentType: DocumentTypeSchema,
  fieldId: FieldIdSchema.nullable(),
  /** Display-safe value. Never a full bank account number. */
  value: z.string(),
  /** Textract confidence for the line this value came from, 0-100, or null when not applicable. */
  ocrConfidence: z.number().min(0).max(100).nullable(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * A finding produced by the deterministic rule engine.
 *
 * `params` carries the substitution values for the reviewed copy in each language, so that a
 * finding is fully renderable in English, Hindi, and Gujarati with no AI involvement at all.
 */
export const FindingSchema = z.object({
  /** Stable within one analysis, so the UI can animate list changes without re-mounting. */
  id: z.string().min(1),
  ruleId: RuleIdSchema,
  status: FindingStatusSchema,
  /** Documents this finding concerns. More than one for cross-document comparisons. */
  documentTypes: z.array(DocumentTypeSchema).min(1),
  params: z.record(z.string()),
  evidence: z.array(EvidenceSchema),
  /** Lowest relevant OCR confidence, when confidence is part of why this fired. */
  ocrConfidence: z.number().min(0).max(100).nullable(),
  /** Always 'deterministic'. Present so the UI can state that no AI decided this. */
  origin: z.literal('deterministic'),
});
export type Finding = z.infer<typeof FindingSchema>;

/** Resolved, reviewed, human-language copy for one finding. Not AI generated. */
export const FindingTextSchema = z.object({
  title: z.string(),
  reason: z.string(),
  suggestedAction: z.string(),
});
export type FindingText = z.infer<typeof FindingTextSchema>;

/** Where a plain-language explanation came from. */
export const ExplanationSourceSchema = z.enum(['bedrock', 'fallback']);
export type ExplanationSource = z.infer<typeof ExplanationSourceSchema>;

export const ExplanationSchema = z.object({
  text: z.string(),
  language: LanguageSchema,
  source: ExplanationSourceSchema,
  /**
   * True when the requested language could not be produced and the text below is the reviewed
   * English fallback. The UI must say so rather than pretending it translated.
   */
  translationUnavailable: z.boolean(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

/** A finding as the API returns it: deterministic core, reviewed copy, optional AI explanation. */
export const PresentedFindingSchema = FindingSchema.extend({
  text: FindingTextSchema,
  explanation: ExplanationSchema.nullable(),
});
export type PresentedFinding = z.infer<typeof PresentedFindingSchema>;

/** What was read out of one document, for the "what we saw" panel. Values are display-safe. */
export const DocumentReadingSchema = z.object({
  documentType: DocumentTypeSchema,
  fields: z.array(
    z.object({
      fieldId: FieldIdSchema,
      value: z.string(),
      ocrConfidence: z.number().min(0).max(100),
    }),
  ),
});
export type DocumentReading = z.infer<typeof DocumentReadingSchema>;

/** The complete deterministic outcome of analysing a document set. */
export const AnalysisOutcomeSchema = z.object({
  overallStatus: OverallStatusSchema,
  findings: z.array(FindingSchema),
  readings: z.array(DocumentReadingSchema),
  /** Document types the template requires that were not supplied at all. */
  missingDocumentTypes: z.array(DocumentTypeSchema),
});
export type AnalysisOutcome = z.infer<typeof AnalysisOutcomeSchema>;
