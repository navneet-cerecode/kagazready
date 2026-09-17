import {
  AnalysisResponseSchema,
  ApiErrorSchema,
  CreateUploadResponseSchema,
  type AnalysisResponse,
  type CreateUploadResponse,
  type DocumentType,
  type ErrorCode,
  type Language,
} from '@kagazready/contracts';

/**
 * Typed client for the KagazReady API.
 *
 * Responses are validated against the shared contract at this boundary and nowhere else in the
 * frontend. File bytes never touch the API: the browser posts them straight to S3 under the
 * presigned policy the API hands back.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/u, '');

export class ApiClientError extends Error {
  constructor(
    readonly code: ErrorCode | 'network' | 'upload_failed' | 'not_configured',
    message: string,
    readonly status?: number,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init: RequestInit, parse: (raw: unknown) => T): Promise<T> {
  if (!BASE_URL) {
    throw new ApiClientError('not_configured', 'The API address is not configured for this build.');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiClientError('network', 'Could not reach the checking service.');
  }

  if (response.status === 204) return parse(undefined);

  const raw: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(raw);
    if (parsed.success) {
      throw new ApiClientError(
        parsed.data.error.code,
        parsed.data.error.message,
        response.status,
        parsed.data.error.correlationId,
      );
    }
    throw new ApiClientError(
      'internal_error',
      'Something went wrong. Please try again.',
      response.status,
    );
  }

  return parse(raw);
}

export function requestUpload(input: {
  analysisId?: string;
  documentType: DocumentType;
  file: File;
}): Promise<CreateUploadResponse> {
  return request(
    '/uploads',
    {
      method: 'POST',
      body: JSON.stringify({
        analysisId: input.analysisId,
        documentType: input.documentType,
        contentType: input.file.type,
        contentLength: input.file.size,
      }),
    },
    (raw) => CreateUploadResponseSchema.parse(raw),
  );
}

/**
 * Post the file to S3 with the presigned policy. XMLHttpRequest rather than fetch so the upload
 * progress event exists — that progress is real, which is the only kind this product shows.
 */
export function uploadToS3(
  presigned: CreateUploadResponse['upload'],
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) form.append(key, value);
    // S3 requires the file to be the last field.
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', presigned.url);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new ApiClientError('upload_failed', 'The upload was not accepted.', xhr.status));
      }
    });
    xhr.addEventListener('error', () =>
      reject(new ApiClientError('network', 'The upload could not be completed.')),
    );
    xhr.addEventListener('abort', () =>
      reject(new ApiClientError('upload_failed', 'The upload was interrupted.')),
    );
    xhr.send(form);
  });
}

export function createAnalysis(input: {
  analysisId: string;
  language: Language;
  documents: { documentType: DocumentType; objectKey: string }[];
}): Promise<AnalysisResponse> {
  return request('/analyses', { method: 'POST', body: JSON.stringify(input) }, (raw) =>
    AnalysisResponseSchema.parse(raw),
  );
}

export function getAnalysis(analysisId: string, language: Language): Promise<AnalysisResponse> {
  return request(`/analyses/${analysisId}?language=${language}`, { method: 'GET' }, (raw) =>
    AnalysisResponseSchema.parse(raw),
  );
}

export function replaceDocument(input: {
  analysisId: string;
  documentType: DocumentType;
  objectKey: string;
  language: Language;
}): Promise<AnalysisResponse> {
  return request(
    `/analyses/${input.analysisId}/documents/${input.documentType}`,
    {
      method: 'PUT',
      body: JSON.stringify({ objectKey: input.objectKey, language: input.language }),
    },
    (raw) => AnalysisResponseSchema.parse(raw),
  );
}

export function deleteAnalysis(analysisId: string): Promise<void> {
  return request(`/analyses/${analysisId}`, { method: 'DELETE' }, () => undefined);
}
