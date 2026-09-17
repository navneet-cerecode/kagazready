import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  AnalysisIdSchema,
  CreateAnalysisRequestSchema,
  DocumentTypeSchema,
  ReplaceDocumentRequestSchema,
  SCHOLARSHIP_READINESS_TEMPLATE,
  type DocumentType,
} from '@kagazready/contracts';
import { createProcessingAnalysis, getAnalysis, type StoredAnalysis } from '../adapters/store.js';
import {
  badRequest,
  conflict,
  jsonResponse,
  log,
  notFound,
  parseBody,
  parsePathParam,
  withHttp,
} from '../http.js';
import { presentAnalysis } from '../present.js';
import { runAnalysis } from '../runAnalysis.js';

/**
 * Writes to an analysis: create one, or replace a single document in one.
 *
 * Both routes land on the same Lambda because both need Textract and Bedrock permissions. The read
 * and delete routes live in a separate function that has neither.
 */

const template = SCHOLARSHIP_READINESS_TEMPLATE;

/** POST /analyses */
async function createAnalysis(
  event: APIGatewayProxyEventV2,
  correlationId: string,
): Promise<APIGatewayProxyResultV2> {
  const request = parseBody(event, CreateAnalysisRequestSchema);

  const documents: Partial<Record<DocumentType, string>> = {};
  for (const document of request.documents) {
    if (documents[document.documentType]) {
      throw badRequest('Each document type may only be uploaded once per check.');
    }
    documents[document.documentType] = document.objectKey;
  }

  const created = await createProcessingAnalysis({
    analysisId: request.analysisId,
    language: request.language,
    templateId: template.id,
    templateVersion: template.version,
    documents,
  });

  if (!created) {
    // Idempotency: the same analysis ID arriving twice must not pay for Textract twice.
    const existing = await getAnalysis(request.analysisId);
    if (!existing) throw conflict('That check has expired. Please start again.');
    if (existing.state === 'processing') {
      throw conflict('That check is already being processed. Please wait a moment.');
    }

    log('info', 'returning existing analysis for repeated request', {
      correlationId,
      analysisId: request.analysisId,
    });
    const presented = await presentAnalysis(existing, request.language);
    return jsonResponse(200, presented.response, correlationId);
  }

  const stored = await getAnalysis(request.analysisId);
  if (!stored) throw conflict('That check could not be started. Please try again.');

  const response = await runAnalysis({
    stored,
    documents,
    language: request.language,
    correlationId,
  });

  return jsonResponse(201, response, correlationId);
}

/** PUT /analyses/{analysisId}/documents/{documentType} */
async function replaceDocument(
  event: APIGatewayProxyEventV2,
  correlationId: string,
): Promise<APIGatewayProxyResultV2> {
  const analysisId = parsePathParam(event, 'analysisId', AnalysisIdSchema);
  const documentType = parsePathParam(event, 'documentType', DocumentTypeSchema);
  const request = parseBody(event, ReplaceDocumentRequestSchema);

  const stored: StoredAnalysis | null = await getAnalysis(analysisId);
  if (!stored) throw notFound();
  if (stored.state === 'processing') {
    throw conflict('That check is still being processed. Please wait a moment.');
  }

  log('info', 'replacing document', { correlationId, analysisId, documentType });

  /*
   * Every document is read again, not just the replacement.
   *
   * Caching the previous OCR text would save two Textract pages per replacement, but it would mean
   * storing unmasked document text — including the full bank account number — in DynamoDB. Two
   * pages of DetectDocumentText cost a fraction of a cent, so the cheaper option here is the one
   * that keeps the account number out of the database.
   */
  const documents = { ...stored.documents, [documentType]: request.objectKey };

  const response = await runAnalysis({
    stored,
    documents,
    language: request.language,
    correlationId,
  });

  return jsonResponse(200, response, correlationId);
}

export const handler = withHttp('analyses (write)', async (event, correlationId) => {
  const route = event.routeKey ?? `${event.requestContext?.http?.method ?? ''} ${event.rawPath}`;

  if (route.startsWith('POST /analyses')) return createAnalysis(event, correlationId);
  if (route.startsWith('PUT /analyses')) return replaceDocument(event, correlationId);

  throw notFound('That endpoint does not exist.');
});
