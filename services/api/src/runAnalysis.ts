import {
  SCHOLARSHIP_READINESS_TEMPLATE,
  type AnalysisResponse,
  type DocumentType,
  type Language,
} from '@kagazready/contracts';
import { analyze, type OcrDocument } from '@kagazready/rules';
import { headObject } from './adapters/s3.js';
import { detectDocumentText } from './adapters/textract.js';
import {
  completeAnalysis,
  reserveDailyAnalysisSlot,
  type StoredAnalysis,
} from './adapters/store.js';
import { HttpError, badRequest, capacityReached, log } from './http.js';
import { presentAnalysis } from './present.js';

/**
 * The analysis pipeline, shared by "create an analysis" and "replace one document".
 *
 * Order matters here and is deliberate:
 *   1. check the documents belong to this analysis,
 *   2. reserve a slot against today's cap,
 *   3. only then spend money on Textract,
 *   4. decide the status deterministically,
 *   5. ask Bedrock to rephrase what was already decided,
 *   6. store the result with a TTL.
 */

const template = SCHOLARSHIP_READINESS_TEMPLATE;

export function assertKeyBelongsToAnalysis(
  objectKey: string,
  analysisId: string,
  documentType: DocumentType,
): void {
  const expected = `uploads/${analysisId}/${documentType}/`;
  if (!objectKey.startsWith(expected)) {
    throw badRequest(
      'That upload does not belong to this check. Please upload the document again.',
      `key ${objectKey} outside prefix ${expected}`,
    );
  }
}

/**
 * Confirm the uploaded object is really there and really within limits.
 *
 * The presigned POST policy already pins the type and size, but S3 is the authority on what was
 * actually stored, and this runs before anything is sent to Textract.
 */
async function verifyUploadedObject(objectKey: string): Promise<void> {
  const { maxFileBytes, acceptedContentTypes } = template.uploadConstraints;
  const facts = await headObject(objectKey);

  if (!facts) {
    throw badRequest(
      'One of your uploads could not be found. Please upload that document again.',
      `missing object ${objectKey}`,
    );
  }
  if (facts.contentLength <= 0 || facts.contentLength > maxFileBytes) {
    throw new HttpError(
      413,
      'payload_too_large',
      `Each document must be smaller than ${Math.floor(maxFileBytes / (1024 * 1024))} MB.`,
      `object ${objectKey} is ${facts.contentLength} bytes`,
    );
  }
  if (!acceptedContentTypes.includes(facts.contentType)) {
    throw new HttpError(
      415,
      'unsupported_media_type',
      'Please upload a JPEG or PNG image.',
      `object ${objectKey} has content type ${facts.contentType}`,
    );
  }
}

export interface RunAnalysisInput {
  stored: StoredAnalysis;
  documents: Partial<Record<DocumentType, string>>;
  language: Language;
  correlationId: string;
  now?: Date;
}

export async function runAnalysis({
  stored,
  documents,
  language,
  correlationId,
  now = new Date(),
}: RunAnalysisInput): Promise<AnalysisResponse> {
  const entries = Object.entries(documents) as [DocumentType, string][];

  if (entries.length === 0) {
    throw badRequest('Please upload at least one document before checking.');
  }
  if (entries.length > template.uploadConstraints.maxDocumentsPerAnalysis) {
    throw badRequest(
      `This check takes at most ${template.uploadConstraints.maxDocumentsPerAnalysis} documents.`,
    );
  }

  for (const [documentType, objectKey] of entries) {
    assertKeyBelongsToAnalysis(objectKey, stored.analysisId, documentType);
  }
  await Promise.all(entries.map(([, objectKey]) => verifyUploadedObject(objectKey)));

  if (!(await reserveDailyAnalysisSlot(now))) {
    log('warn', 'daily analysis cap reached', { correlationId });
    throw capacityReached();
  }

  // Textract is charged per page, so this is the one place real money is spent. It is bounded by
  // maxDocumentsPerAnalysis above and by the daily cap just reserved.
  const ocrDocuments: OcrDocument[] = await Promise.all(
    entries.map(([documentType, objectKey]) => detectDocumentText(documentType, objectKey)),
  );

  const outcome = analyze({ documents: ocrDocuments, template, now });

  log('info', 'analysis decided', {
    correlationId,
    analysisId: stored.analysisId,
    status: outcome.overallStatus,
    findingCount: outcome.findings.length,
    ruleIds: outcome.findings.map((finding) => finding.ruleId).join(','),
  });

  const presented = await presentAnalysis(
    { ...stored, documents, outcome, explanations: {}, updatedAt: now.toISOString() },
    language,
  );

  await completeAnalysis({
    analysisId: stored.analysisId,
    outcome,
    documents,
    language,
    explanations: presented.generatedExplanations ?? {},
  });

  return presented.response;
}
