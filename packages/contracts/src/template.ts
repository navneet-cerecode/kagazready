import { z } from 'zod';
import { DocumentTypeSchema, FieldIdSchema, type DocumentType, type FieldId } from './domain.js';

/**
 * A versioned scholarship-readiness template.
 *
 * Requirements differ between scholarships. This is one configurable template, and the UI states
 * plainly that the checklist is not universal. Bumping `version` is how a requirement change is
 * recorded — never edit a published version in place.
 */

export const ExpectedFieldSchema = z.object({
  fieldId: FieldIdSchema,
  /** When false, absence is not a finding — the field is read if present and otherwise ignored. */
  required: z.boolean(),
  /**
   * Label text used to locate the value in OCR output. Case-insensitive, matched after
   * normalization. Several aliases because layouts differ between boards and banks.
   */
  labels: z.array(z.string().min(1)).min(1),
  /**
   * Textract line confidence below which the value is reported as unclear rather than trusted.
   * Higher for values a human cannot guess from context, such as an account number.
   */
  minOcrConfidence: z.number().min(0).max(100),
  /** How the value is treated by the rules. Drives normalization and validation. */
  kind: z.enum(['person_name', 'account_number', 'ifsc', 'date', 'amount', 'text']),
});
export type ExpectedField = z.infer<typeof ExpectedFieldSchema>;

export const RequiredDocumentSchema = z.object({
  documentType: DocumentTypeSchema,
  expectedFields: z.array(ExpectedFieldSchema).min(1),
});
export type RequiredDocument = z.infer<typeof RequiredDocumentSchema>;

export const UploadConstraintsSchema = z.object({
  maxFileBytes: z.number().int().positive(),
  acceptedContentTypes: z.array(z.string().min(1)).min(1),
  maxDocumentsPerAnalysis: z.number().int().positive(),
});
export type UploadConstraints = z.infer<typeof UploadConstraintsSchema>;

export const TemplateSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  /** Publicly published official guidance this checklist was derived from. */
  officialSource: z.object({
    name: z.string().min(1),
    url: z.string().url(),
  }),
  /** ISO date on which a human last checked this template against the official source. */
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requiredDocuments: z.array(RequiredDocumentSchema).min(1),
  /** Person-name fields compared across documents to detect inconsistency. */
  crossDocumentNameFields: z.array(FieldIdSchema).min(2),
  uploadConstraints: UploadConstraintsSchema,
});
export type Template = z.infer<typeof TemplateSchema>;

const NAME_CONFIDENCE = 80;
const CRITICAL_CONFIDENCE = 88;
const GENERAL_CONFIDENCE = 75;

export const SCHOLARSHIP_READINESS_TEMPLATE: Template = {
  id: 'scholarship-readiness-general',
  version: '1.0.0',
  officialSource: {
    name: 'National Scholarship Portal — published document guidance for post-matric scholarships',
    url: 'https://scholarships.gov.in/',
  },
  lastReviewed: '2026-09-17',
  crossDocumentNameFields: [
    'marksheet_candidate_name',
    'income_applicant_name',
    'bank_account_holder_name',
  ],
  uploadConstraints: {
    maxFileBytes: 5 * 1024 * 1024,
    acceptedContentTypes: ['image/jpeg', 'image/png'],
    maxDocumentsPerAnalysis: 3,
  },
  requiredDocuments: [
    {
      documentType: 'class_xii_marksheet',
      expectedFields: [
        {
          fieldId: 'marksheet_candidate_name',
          required: true,
          labels: [
            'candidate name',
            'student name',
            'name of candidate',
            'name of student',
            'name',
          ],
          minOcrConfidence: NAME_CONFIDENCE,
          kind: 'person_name',
        },
        {
          fieldId: 'marksheet_board',
          required: true,
          labels: ['board', 'board name', 'examination board', 'name of board'],
          minOcrConfidence: GENERAL_CONFIDENCE,
          kind: 'text',
        },
        {
          fieldId: 'marksheet_exam_year',
          required: true,
          labels: ['year of examination', 'exam year', 'year of passing', 'passing year', 'year'],
          minOcrConfidence: GENERAL_CONFIDENCE,
          kind: 'text',
        },
        {
          fieldId: 'marksheet_roll_number',
          required: true,
          labels: ['roll number', 'roll no', 'roll no.', 'seat number', 'enrolment number'],
          minOcrConfidence: CRITICAL_CONFIDENCE,
          kind: 'text',
        },
      ],
    },
    {
      documentType: 'income_certificate',
      expectedFields: [
        {
          fieldId: 'income_applicant_name',
          required: true,
          labels: ['applicant name', 'name of applicant', 'beneficiary name', 'name'],
          minOcrConfidence: NAME_CONFIDENCE,
          kind: 'person_name',
        },
        {
          fieldId: 'income_annual_income',
          required: true,
          labels: ['annual income', 'total annual income', 'family income', 'income'],
          minOcrConfidence: CRITICAL_CONFIDENCE,
          kind: 'amount',
        },
        {
          fieldId: 'income_issue_date',
          required: true,
          labels: ['date of issue', 'issue date', 'issued on', 'date'],
          minOcrConfidence: GENERAL_CONFIDENCE,
          kind: 'date',
        },
        {
          fieldId: 'income_issuing_authority',
          required: false,
          labels: ['issuing authority', 'authority', 'issued by'],
          minOcrConfidence: GENERAL_CONFIDENCE,
          kind: 'text',
        },
      ],
    },
    {
      documentType: 'bank_proof',
      expectedFields: [
        {
          fieldId: 'bank_account_holder_name',
          required: true,
          labels: ['account holder', 'account holder name', 'holder name', 'name'],
          minOcrConfidence: NAME_CONFIDENCE,
          kind: 'person_name',
        },
        {
          fieldId: 'bank_account_number',
          required: true,
          labels: ['account number', 'account no', 'account no.', 'a/c no', 'a/c number'],
          minOcrConfidence: CRITICAL_CONFIDENCE,
          kind: 'account_number',
        },
        {
          fieldId: 'bank_ifsc',
          required: true,
          labels: ['ifsc', 'ifsc code', 'ifs code'],
          minOcrConfidence: CRITICAL_CONFIDENCE,
          kind: 'ifsc',
        },
        {
          fieldId: 'bank_name',
          required: true,
          labels: ['bank name', 'bank', 'name of bank'],
          minOcrConfidence: GENERAL_CONFIDENCE,
          kind: 'text',
        },
      ],
    },
  ],
};

/** Convenience lookups, so callers do not re-scan the template. */
export function expectedFieldsFor(template: Template, documentType: DocumentType): ExpectedField[] {
  return (
    template.requiredDocuments.find((d) => d.documentType === documentType)?.expectedFields ?? []
  );
}

export function expectedFieldById(template: Template, fieldId: FieldId): ExpectedField | undefined {
  for (const document of template.requiredDocuments) {
    const field = document.expectedFields.find((f) => f.fieldId === fieldId);
    if (field) return field;
  }
  return undefined;
}

export function documentTypeForField(
  template: Template,
  fieldId: FieldId,
): DocumentType | undefined {
  return template.requiredDocuments.find((d) => d.expectedFields.some((f) => f.fieldId === fieldId))
    ?.documentType;
}
