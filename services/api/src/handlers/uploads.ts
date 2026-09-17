import {
  CreateUploadRequestSchema,
  SCHOLARSHIP_READINESS_TEMPLATE,
  type CreateUploadResponse,
} from '@kagazready/contracts';
import { newAnalysisId, newObjectKey, presignUpload } from '../adapters/s3.js';
import { HttpError, jsonResponse, log, parseBody, withHttp } from '../http.js';

/**
 * POST /uploads — hand the browser a tightly constrained presigned S3 POST.
 *
 * No file bytes pass through this function. The browser posts straight to S3 under a policy that
 * pins the exact key, the content type, and a maximum size, and expires within minutes.
 */

const { maxFileBytes, acceptedContentTypes } = SCHOLARSHIP_READINESS_TEMPLATE.uploadConstraints;

export const handler = withHttp('POST /uploads', async (event, correlationId) => {
  const request = parseBody(event, CreateUploadRequestSchema);

  if (!acceptedContentTypes.includes(request.contentType)) {
    throw new HttpError(
      415,
      'unsupported_media_type',
      'Please upload a JPEG or PNG image.',
      `rejected content type ${request.contentType}`,
    );
  }
  if (request.contentLength > maxFileBytes) {
    throw new HttpError(
      413,
      'payload_too_large',
      `Each document must be smaller than ${Math.floor(maxFileBytes / (1024 * 1024))} MB.`,
      `declared ${request.contentLength} bytes`,
    );
  }

  // A caller may supply an analysis ID from an earlier upload in the same set; otherwise this is
  // the first document and the ID starts here.
  const analysisId = request.analysisId ?? newAnalysisId();
  const objectKey = newObjectKey(analysisId, request.documentType, request.contentType);
  const upload = await presignUpload(objectKey, request.contentType, maxFileBytes);

  log('info', 'presigned upload issued', {
    correlationId,
    analysisId,
    documentType: request.documentType,
    expiresInSeconds: upload.expiresInSeconds,
  });

  const response: CreateUploadResponse = {
    analysisId,
    documentType: request.documentType,
    objectKey,
    upload: { url: upload.url, fields: upload.fields },
    expiresInSeconds: upload.expiresInSeconds,
  };

  return jsonResponse(201, response, correlationId);
});
