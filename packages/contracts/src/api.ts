import { z } from 'zod';
import {
  DocumentReadingSchema,
  DocumentTypeSchema,
  LanguageSchema,
  OverallStatusSchema,
  PresentedFindingSchema,
} from './domain.js';

/**
 * HTTP contract shared by the Lambda handlers and the frontend. Request schemas are the trust
 * boundary — nothing past them re-validates.
 */

/** Analysis IDs are 32 lowercase hex characters from a CSPRNG: unguessable, URL-safe. */
export const AnalysisIdSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/, 'analysisId must be 32 hexadecimal characters');

/**
 * Object keys are server-generated and always of the form
 * `uploads/<analysisId>/<documentType>/<random>.<ext>`. The client echoes back the key it was
 * given; the server re-checks the shape and the analysis prefix before touching S3.
 */
export const ObjectKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^uploads\/[0-9a-f]{32}\/(class_xii_marksheet|income_certificate|bank_proof)\/[0-9a-f]{16}\.(jpg|png)$/,
    'objectKey is not a well-formed KagazReady upload key',
  );

/**
 * Any declared content type is accepted by the schema; the handler then checks it against
 * `template.uploadConstraints.acceptedContentTypes` and answers 415 if it is not allowed.
 *
 * The list deliberately lives in the template only. Duplicating it here as an enum made the schema
 * reject first, which turned the template's list into decoration and the 415 path into dead code.
 */
export const ContentTypeSchema = z.string().min(1).max(64);

// ---------------------------------------------------------------------------
// POST /uploads
// ---------------------------------------------------------------------------

export const CreateUploadRequestSchema = z.object({
  /** Omit on the first call; the response carries the analysisId to reuse for the rest. */
  analysisId: AnalysisIdSchema.optional(),
  documentType: DocumentTypeSchema,
  contentType: ContentTypeSchema,
  /** Declared byte length, checked here and enforced again by the presigned POST policy. */
  contentLength: z.number().int().positive(),
});
export type CreateUploadRequest = z.infer<typeof CreateUploadRequestSchema>;

export const CreateUploadResponseSchema = z.object({
  analysisId: AnalysisIdSchema,
  documentType: DocumentTypeSchema,
  objectKey: ObjectKeySchema,
  /** Presigned S3 POST. The browser posts the file directly; the API never proxies bytes. */
  upload: z.object({
    url: z.string().url(),
    fields: z.record(z.string()),
  }),
  expiresInSeconds: z.number().int().positive(),
});
export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;

// ---------------------------------------------------------------------------
// POST /analyses
// ---------------------------------------------------------------------------

export const AnalysisDocumentInputSchema = z.object({
  documentType: DocumentTypeSchema,
  objectKey: ObjectKeySchema,
});
export type AnalysisDocumentInput = z.infer<typeof AnalysisDocumentInputSchema>;

export const CreateAnalysisRequestSchema = z.object({
  analysisId: AnalysisIdSchema,
  language: LanguageSchema,
  documents: z.array(AnalysisDocumentInputSchema).min(1).max(3),
});
export type CreateAnalysisRequest = z.infer<typeof CreateAnalysisRequestSchema>;

// ---------------------------------------------------------------------------
// PUT /analyses/{analysisId}/documents/{documentType}
// ---------------------------------------------------------------------------

export const ReplaceDocumentRequestSchema = z.object({
  objectKey: ObjectKeySchema,
  language: LanguageSchema,
});
export type ReplaceDocumentRequest = z.infer<typeof ReplaceDocumentRequestSchema>;

// ---------------------------------------------------------------------------
// Analysis representation
// ---------------------------------------------------------------------------

export const AnalysisResponseSchema = z.object({
  analysisId: AnalysisIdSchema,
  templateId: z.string(),
  templateVersion: z.string(),
  language: LanguageSchema,
  status: OverallStatusSchema,
  findings: z.array(PresentedFindingSchema),
  readings: z.array(DocumentReadingSchema),
  missingDocumentTypes: z.array(DocumentTypeSchema),
  documentTypesPresent: z.array(DocumentTypeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** ISO timestamp after which the stored result is gone. Shown to the user. */
  expiresAt: z.string(),
  /**
   * True when at least one plain-language explanation had to fall back because Bedrock was
   * unavailable or returned output that failed schema validation. The UI says so honestly.
   */
  explanationsDegraded: z.boolean(),
});
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  templateId: z.string(),
  templateVersion: z.string(),
  timeUtc: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Client-safe error codes. No internal detail, no resource names, no stack traces. */
export const ERROR_CODES = [
  'validation_error',
  'unsupported_media_type',
  'payload_too_large',
  'not_found',
  'conflict',
  'capacity_reached',
  'upstream_unavailable',
  'internal_error',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    /** Safe for display. Never contains internal detail. */
    message: z.string(),
    /** Echoed in logs so a user can quote it in a support request. */
    correlationId: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
