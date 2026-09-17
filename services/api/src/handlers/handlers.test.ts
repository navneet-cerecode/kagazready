import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { AnalysisResponse, ApiError, CreateUploadResponse } from '@kagazready/contracts';
import type { OcrDocument } from '@kagazready/rules';
import { bankDocument, incomeDocument, marksheetDocument } from '@kagazready/rules/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn(async (_client: unknown, input: Record<string, unknown>) => ({
    url: 'https://kagazready-test-bucket.s3.ap-south-1.amazonaws.com/',
    fields: {
      key: String(input.Key),
      'Content-Type': String(
        (input.Fields as Record<string, string> | undefined)?.['Content-Type'] ?? '',
      ),
      policy: 'base64-policy',
      'x-amz-signature': 'signature',
    },
  })),
}));

import { setBedrockClient } from '../adapters/bedrock.js';
import { setS3Client } from '../adapters/s3.js';
import { setDocumentClient } from '../adapters/store.js';
import { setTextractClient } from '../adapters/textract.js';
import { resetConfigCache } from '../config.js';
import {
  fakeBedrock,
  fakeDynamo,
  fakeS3,
  fakeTextract,
  type FakeDynamo,
  type FakeS3,
  type FakeTextract,
} from '../testing/fakeAws.js';
import { handler as analysesHandler } from './analyses.js';
import { handler as analysisHandler } from './analysis.js';
import { handler as healthHandler } from './health.js';
import { handler as uploadsHandler } from './uploads.js';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const ANALYSIS_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const OTHER_ANALYSIS_ID = '00112233445566778899aabbccddeeff';

const key = (analysisId: string, documentType: string, token: string) =>
  `uploads/${analysisId}/${documentType}/${token}.jpg`;

const TOKENS = {
  class_xii_marksheet: '1111111111111111',
  income_certificate: '2222222222222222',
  bank_proof: '3333333333333333',
} as const;

/** The three upload keys belonging to a given analysis. */
const keysFor = (analysisId: string) => ({
  class_xii_marksheet: key(analysisId, 'class_xii_marksheet', TOKENS.class_xii_marksheet),
  income_certificate: key(analysisId, 'income_certificate', TOKENS.income_certificate),
  bank_proof: key(analysisId, 'bank_proof', TOKENS.bank_proof),
});

const MARKSHEET_KEY = keysFor(ANALYSIS_ID).class_xii_marksheet;
const INCOME_KEY = keysFor(ANALYSIS_ID).income_certificate;
const BANK_KEY = keysFor(ANALYSIS_ID).bank_proof;
const BANK_REPLACEMENT_KEY = key(ANALYSIS_ID, 'bank_proof', '4444444444444444');
const OTHER_KEYS = keysFor(OTHER_ANALYSIS_ID);

/** Stable finding ids produced by the rule engine for the scenario A document set. */
const UNCLEAR_FINDING_ID = 'field_unclear_low_confidence:bank_proof:bank_account_number';
const NAME_FINDING_ID =
  'name_material_difference:bank_proof+class_xii_marksheet+income_certificate:bank_account_holder_name';

const IMAGE = { contentLength: 250_000, contentType: 'image/jpeg' };

const event = (
  routeKey: string,
  options: {
    body?: unknown;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
  } = {},
): APIGatewayProxyEventV2 => {
  const [method, path] = routeKey.split(' ');
  return {
    version: '2.0',
    routeKey,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    isBase64Encoded: false,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    pathParameters: options.pathParameters,
    queryStringParameters: options.queryStringParameters,
    requestContext: { http: { method, path } },
  } as unknown as APIGatewayProxyEventV2;
};

const result = (response: unknown): APIGatewayProxyStructuredResultV2 =>
  response as APIGatewayProxyStructuredResultV2;

const bodyOf = <T>(response: unknown): T => JSON.parse(result(response).body ?? '{}') as T;

/** OCR text returned for each uploaded object, keyed the way Textract is addressed. */
const problemBankDocument = () =>
  bankDocument({ accountHolderName: 'Priya Rameshbhai Shah', accountNumberConfidence: 61.3 });

const scenarioAOcr = (): Record<string, OcrDocument> => ({
  [MARKSHEET_KEY]: marksheetDocument(),
  [INCOME_KEY]: incomeDocument(),
  [BANK_KEY]: problemBankDocument(),
  [BANK_REPLACEMENT_KEY]: bankDocument(),
  // A second analysis, used by the daily-cap test.
  [OTHER_KEYS.class_xii_marksheet]: marksheetDocument(),
  [OTHER_KEYS.income_certificate]: incomeDocument(),
  [OTHER_KEYS.bank_proof]: problemBankDocument(),
});

let dynamo: FakeDynamo;
let s3: FakeS3;
let textract: FakeTextract;

interface Wiring {
  bedrockText?: string;
  bedrockFails?: boolean;
  textractFailsFor?: string;
  modelId?: string;
  objects?: Record<string, { contentLength: number; contentType: string }>;
}

function wire(options: Wiring = {}): void {
  process.env.UPLOAD_BUCKET = 'kagazready-test-bucket';
  process.env.TABLE_NAME = 'kagazready-test-table';
  process.env.AWS_REGION = 'ap-south-1';
  process.env.ALLOWED_ORIGIN = 'https://kagazready.example';
  process.env.STAGE = 'prod';
  process.env.DAILY_ANALYSIS_CAP = '150';
  if (options.modelId === undefined) delete process.env.BEDROCK_MODEL_ID;
  else process.env.BEDROCK_MODEL_ID = options.modelId;
  resetConfigCache();

  dynamo = fakeDynamo();
  s3 = fakeS3({
    objects: options.objects ?? {
      [MARKSHEET_KEY]: IMAGE,
      [INCOME_KEY]: IMAGE,
      [BANK_KEY]: IMAGE,
      [BANK_REPLACEMENT_KEY]: IMAGE,
      [OTHER_KEYS.class_xii_marksheet]: IMAGE,
      [OTHER_KEYS.income_certificate]: IMAGE,
      [OTHER_KEYS.bank_proof]: IMAGE,
    },
  });
  textract = fakeTextract(scenarioAOcr(), options.textractFailsFor);
  const bedrock = fakeBedrock({ text: options.bedrockText, fail: options.bedrockFails });

  setDocumentClient(dynamo.client);
  setS3Client(s3.client);
  setTextractClient(textract.client);
  setBedrockClient(bedrock.client);
}

const createAnalysisEvent = (analysisId = ANALYSIS_ID, language = 'en') => {
  const keys = keysFor(analysisId);
  return event('POST /analyses', {
    body: {
      analysisId,
      language,
      documents: [
        { documentType: 'class_xii_marksheet', objectKey: keys.class_xii_marksheet },
        { documentType: 'income_certificate', objectKey: keys.income_certificate },
        { documentType: 'bank_proof', objectKey: keys.bank_proof },
      ],
    },
  });
};

beforeEach(() => {
  wire();
});

afterEach(() => {
  setDocumentClient(undefined);
  setS3Client(undefined);
  setTextractClient(undefined);
  setBedrockClient(undefined);
  resetConfigCache();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /uploads
// ---------------------------------------------------------------------------

describe('POST /uploads', () => {
  it('issues a presigned POST pinned to a key inside the analysis prefix', async () => {
    const response = await uploadsHandler(
      event('POST /uploads', {
        body: {
          analysisId: ANALYSIS_ID,
          documentType: 'bank_proof',
          contentType: 'image/jpeg',
          contentLength: 120_000,
        },
      }),
    );

    expect(result(response).statusCode).toBe(201);
    const body = bodyOf<CreateUploadResponse>(response);
    expect(body.analysisId).toBe(ANALYSIS_ID);
    expect(body.objectKey).toMatch(
      new RegExp(`^uploads/${ANALYSIS_ID}/bank_proof/[0-9a-f]{16}\\.jpg$`),
    );
    expect(body.upload.fields.key).toBe(body.objectKey);
    expect(body.upload.fields['Content-Type']).toBe('image/jpeg');
    expect(body.expiresInSeconds).toBeLessThanOrEqual(300);
  });

  it('constrains the presigned policy to the key, the type and a size range', async () => {
    const { createPresignedPost } = await import('@aws-sdk/s3-presigned-post');
    await uploadsHandler(
      event('POST /uploads', {
        body: {
          documentType: 'bank_proof',
          contentType: 'image/png',
          contentLength: 100,
        },
      }),
    );

    const input = vi.mocked(createPresignedPost).mock.calls[0]?.[1] as {
      Conditions: unknown[];
      Expires: number;
    };
    expect(input.Conditions).toEqual([
      ['eq', '$key', expect.stringMatching(/\.png$/)],
      ['eq', '$Content-Type', 'image/png'],
      ['content-length-range', 1, 5 * 1024 * 1024],
    ]);
    expect(input.Expires).toBeLessThanOrEqual(300);
  });

  it('starts a new analysis id when none is supplied', async () => {
    const response = await uploadsHandler(
      event('POST /uploads', {
        body: {
          documentType: 'class_xii_marksheet',
          contentType: 'image/jpeg',
          contentLength: 100,
        },
      }),
    );

    expect(bodyOf<CreateUploadResponse>(response).analysisId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rejects a content type the template does not accept', async () => {
    const response = await uploadsHandler(
      event('POST /uploads', {
        body: {
          documentType: 'bank_proof',
          contentType: 'application/pdf',
          contentLength: 100,
        },
      }),
    );

    expect(result(response).statusCode).toBe(415);
    expect(bodyOf<ApiError>(response).error.code).toBe('unsupported_media_type');
    expect(bodyOf<ApiError>(response).error.message).toContain('JPEG or PNG');
  });

  it('rejects a file larger than the 5 MB limit', async () => {
    const response = await uploadsHandler(
      event('POST /uploads', {
        body: {
          documentType: 'bank_proof',
          contentType: 'image/jpeg',
          contentLength: 6 * 1024 * 1024,
        },
      }),
    );

    expect(result(response).statusCode).toBe(413);
    expect(bodyOf<ApiError>(response).error.code).toBe('payload_too_large');
  });

  it('rejects a malformed body with a validation error naming the fields', async () => {
    const response = await uploadsHandler(event('POST /uploads', { body: { nonsense: true } }));

    expect(result(response).statusCode).toBe(400);
    expect(bodyOf<ApiError>(response).error.code).toBe('validation_error');
    expect(bodyOf<ApiError>(response).error.message).toContain('documentType');
  });

  it('rejects a request with no body at all', async () => {
    expect(result(await uploadsHandler(event('POST /uploads'))).statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /analyses
// ---------------------------------------------------------------------------

describe('POST /analyses', () => {
  it('runs the real pipeline and returns needs review for the scenario A set', async () => {
    const response = await analysesHandler(createAnalysisEvent());

    expect(result(response).statusCode).toBe(201);
    const body = bodyOf<AnalysisResponse>(response);
    expect(body.status).toBe('needs_review');
    expect(body.findings.map((finding) => finding.ruleId).sort()).toEqual([
      'field_unclear_low_confidence',
      'name_material_difference',
    ]);
    expect(textract.requestedKeys.sort()).toEqual([MARKSHEET_KEY, BANK_KEY, INCOME_KEY].sort());
  });

  it('masks the account number everywhere in the response', async () => {
    const response = await analysesHandler(createAnalysisEvent());

    expect(result(response).body).not.toContain('304988127745');
    expect(result(response).body).not.toContain('3049 8812 7745');
    expect(result(response).body).toContain('XXXXXXXX7745');
  });

  it('marks every finding as deterministic in origin', async () => {
    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.findings.every((finding) => finding.origin === 'deterministic')).toBe(true);
  });

  it('does not call Textract twice for a repeated request with the same analysis id', async () => {
    await analysesHandler(createAnalysisEvent());
    const callsAfterFirst = textract.requestedKeys.length;

    const repeat = await analysesHandler(createAnalysisEvent());

    expect(result(repeat).statusCode).toBe(200);
    expect(textract.requestedKeys.length).toBe(callsAfterFirst);
    expect(bodyOf<AnalysisResponse>(repeat).status).toBe('needs_review');
  });

  it('rejects an object key belonging to a different analysis, before calling Textract', async () => {
    const response = await analysesHandler(
      event('POST /analyses', {
        body: {
          analysisId: ANALYSIS_ID,
          language: 'en',
          documents: [
            {
              documentType: 'bank_proof',
              objectKey: key(OTHER_ANALYSIS_ID, 'bank_proof', '5555555555555555'),
            },
          ],
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('rejects an object key whose document type does not match the path it sits under', async () => {
    const response = await analysesHandler(
      event('POST /analyses', {
        body: {
          analysisId: ANALYSIS_ID,
          language: 'en',
          documents: [{ documentType: 'bank_proof', objectKey: MARKSHEET_KEY }],
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('rejects a key that is not a well-formed upload key', async () => {
    const response = await analysesHandler(
      event('POST /analyses', {
        body: {
          analysisId: ANALYSIS_ID,
          language: 'en',
          documents: [{ documentType: 'bank_proof', objectKey: '../../etc/passwd' }],
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('reports a missing S3 object as a bad request, not a server error', async () => {
    wire({ objects: { [MARKSHEET_KEY]: IMAGE, [INCOME_KEY]: IMAGE } });

    const response = await analysesHandler(createAnalysisEvent());

    expect(result(response).statusCode).toBe(400);
    expect(bodyOf<ApiError>(response).error.message).toContain('upload');
    expect(textract.requestedKeys).toEqual([]);
  });

  it('rejects an object that turns out to be too large in S3', async () => {
    wire({
      objects: {
        [MARKSHEET_KEY]: IMAGE,
        [INCOME_KEY]: IMAGE,
        [BANK_KEY]: { contentLength: 9 * 1024 * 1024, contentType: 'image/jpeg' },
      },
    });

    expect(result(await analysesHandler(createAnalysisEvent())).statusCode).toBe(413);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('rejects an object that turns out to be the wrong type in S3', async () => {
    wire({
      objects: {
        [MARKSHEET_KEY]: IMAGE,
        [INCOME_KEY]: IMAGE,
        [BANK_KEY]: { contentLength: 1000, contentType: 'application/pdf' },
      },
    });

    expect(result(await analysesHandler(createAnalysisEvent())).statusCode).toBe(415);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('rejects the same document type supplied twice', async () => {
    const response = await analysesHandler(
      event('POST /analyses', {
        body: {
          analysisId: ANALYSIS_ID,
          language: 'en',
          documents: [
            { documentType: 'bank_proof', objectKey: BANK_KEY },
            { documentType: 'bank_proof', objectKey: BANK_REPLACEMENT_KEY },
          ],
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
  });

  it('rejects more than three documents at the schema boundary', async () => {
    const response = await analysesHandler(
      event('POST /analyses', {
        body: {
          analysisId: ANALYSIS_ID,
          language: 'en',
          documents: [
            { documentType: 'class_xii_marksheet', objectKey: MARKSHEET_KEY },
            { documentType: 'income_certificate', objectKey: INCOME_KEY },
            { documentType: 'bank_proof', objectKey: BANK_KEY },
            { documentType: 'bank_proof', objectKey: BANK_REPLACEMENT_KEY },
          ],
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
    expect(textract.requestedKeys).toEqual([]);
  });

  it('returns a retryable 503 with no internal detail when Textract fails', async () => {
    wire({ textractFailsFor: BANK_KEY });

    const response = await analysesHandler(createAnalysisEvent());

    expect(result(response).statusCode).toBe(503);
    const body = bodyOf<ApiError>(response);
    expect(body.error.code).toBe('upstream_unavailable');
    expect(body.error.correlationId).toMatch(/^[0-9a-f]{16}$/);
    expect(result(response).body).not.toContain('kagazready-test-bucket');
    expect(result(response).body).not.toContain('InternalServerError');
  });

  it('stops before Textract once the daily cap is reached', async () => {
    process.env.DAILY_ANALYSIS_CAP = '1';
    resetConfigCache();

    await analysesHandler(createAnalysisEvent());
    const callsAfterFirst = textract.requestedKeys.length;
    const response = await analysesHandler(createAnalysisEvent(OTHER_ANALYSIS_ID));

    expect(result(response).statusCode).toBe(429);
    expect(bodyOf<ApiError>(response).error.code).toBe('capacity_reached');
    expect(textract.requestedKeys.length).toBe(callsAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// Bedrock behaviour
// ---------------------------------------------------------------------------

describe('Bedrock explanations', () => {
  const validBedrockJson = JSON.stringify({
    explanations: [
      { findingId: UNCLEAR_FINDING_ID, explanation: 'The account number came out blurry.' },
      { findingId: NAME_FINDING_ID, explanation: 'The surname is different on the bank document.' },
    ],
  });

  it('uses the model explanation when the output is valid', async () => {
    wire({ modelId: 'test.model-v1', bedrockText: validBedrockJson });

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.explanationsDegraded).toBe(false);
    expect(body.findings.every((finding) => finding.explanation?.source === 'bedrock')).toBe(true);
    expect(body.findings.map((finding) => finding.explanation?.text)).toContain(
      'The account number came out blurry.',
    );
  });

  it('keeps the deterministic findings and falls back when Bedrock fails', async () => {
    wire({ modelId: 'test.model-v1', bedrockFails: true });

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.status).toBe('needs_review');
    expect(body.findings).toHaveLength(2);
    expect(body.explanationsDegraded).toBe(true);
    expect(body.findings.every((finding) => finding.explanation?.source === 'fallback')).toBe(true);
    expect(body.findings[0]?.explanation?.text.length).toBeGreaterThan(20);
  });

  it('falls back when the model returns something that is not JSON', async () => {
    wire({ modelId: 'test.model-v1', bedrockText: 'Sure! Here is my answer in prose.' });

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.status).toBe('needs_review');
    expect(body.explanationsDegraded).toBe(true);
  });

  it('falls back when the model output fails schema validation', async () => {
    wire({
      modelId: 'test.model-v1',
      bedrockText: JSON.stringify({ explanations: [{ findingId: UNCLEAR_FINDING_ID }] }),
    });

    expect(
      bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent())).explanationsDegraded,
    ).toBe(true);
  });

  it('rejects model output that implies an application decision', async () => {
    wire({
      modelId: 'test.model-v1',
      bedrockText: JSON.stringify({
        explanations: [
          {
            findingId: UNCLEAR_FINDING_ID,
            explanation: 'Your application will be rejected because of this.',
          },
        ],
      }),
    });

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.explanationsDegraded).toBe(true);
    expect(result(body as unknown).body ?? JSON.stringify(body)).not.toContain('rejected');
  });

  it('discards an explanation for a finding it never sent', async () => {
    wire({
      modelId: 'test.model-v1',
      bedrockText: JSON.stringify({
        explanations: [
          { findingId: 'invented_finding_id', explanation: 'Something the model made up.' },
        ],
      }),
    });

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(body.findings.every((finding) => finding.explanation?.source === 'fallback')).toBe(true);
    expect(JSON.stringify(body)).not.toContain('Something the model made up.');
  });

  it('marks the translation unavailable when a fallback is used for Hindi', async () => {
    wire({ modelId: 'test.model-v1', bedrockFails: true });

    const body = bodyOf<AnalysisResponse>(
      await analysesHandler(createAnalysisEvent(ANALYSIS_ID, 'hi')),
    );

    expect(body.language).toBe('hi');
    expect(body.findings[0]?.explanation?.translationUnavailable).toBe(true);
    expect(body.findings[0]?.explanation?.language).toBe('en');
    // The reviewed Hindi copy is still there: only the extra paragraph fell back.
    expect(body.findings.map((finding) => finding.text.title).join(' ')).toMatch(/[ऀ-ॿ]/);
  });

  it('does not call Bedrock at all when no model is configured', async () => {
    const bedrock = fakeBedrock({ text: validBedrockJson });
    setBedrockClient(bedrock.client);

    const body = bodyOf<AnalysisResponse>(await analysesHandler(createAnalysisEvent()));

    expect(bedrock.calls).toBe(0);
    expect(body.explanationsDegraded).toBe(true);
    expect(body.status).toBe('needs_review');
  });
});

// ---------------------------------------------------------------------------
// Replace, read, delete
// ---------------------------------------------------------------------------

describe('PUT /analyses/{analysisId}/documents/{documentType}', () => {
  it('reaches no issues found after the problem document is replaced', async () => {
    await analysesHandler(createAnalysisEvent());

    const response = await analysesHandler(
      event('PUT /analyses/{analysisId}/documents/{documentType}', {
        pathParameters: { analysisId: ANALYSIS_ID, documentType: 'bank_proof' },
        body: { objectKey: BANK_REPLACEMENT_KEY, language: 'en' },
      }),
    );

    expect(result(response).statusCode).toBe(200);
    const body = bodyOf<AnalysisResponse>(response);
    expect(body.status).toBe('no_issues_found');
    expect(body.findings).toEqual([]);
  });

  it('refuses a replacement for an analysis that does not exist', async () => {
    const response = await analysesHandler(
      event('PUT /analyses/{analysisId}/documents/{documentType}', {
        pathParameters: { analysisId: OTHER_ANALYSIS_ID, documentType: 'bank_proof' },
        body: {
          objectKey: key(OTHER_ANALYSIS_ID, 'bank_proof', '6666666666666666'),
          language: 'en',
        },
      }),
    );

    expect(result(response).statusCode).toBe(404);
  });

  it('refuses a replacement key that belongs to another analysis', async () => {
    await analysesHandler(createAnalysisEvent());
    const before = textract.requestedKeys.length;

    const response = await analysesHandler(
      event('PUT /analyses/{analysisId}/documents/{documentType}', {
        pathParameters: { analysisId: ANALYSIS_ID, documentType: 'bank_proof' },
        body: {
          objectKey: key(OTHER_ANALYSIS_ID, 'bank_proof', '7777777777777777'),
          language: 'en',
        },
      }),
    );

    expect(result(response).statusCode).toBe(400);
    expect(textract.requestedKeys.length).toBe(before);
  });
});

describe('GET /analyses/{analysisId}', () => {
  it('returns the stored analysis', async () => {
    await analysesHandler(createAnalysisEvent());

    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );

    expect(result(response).statusCode).toBe(200);
    expect(bodyOf<AnalysisResponse>(response).status).toBe('needs_review');
  });

  it('re-renders the reviewed copy in another language on request', async () => {
    await analysesHandler(createAnalysisEvent());

    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', {
        pathParameters: { analysisId: ANALYSIS_ID },
        queryStringParameters: { language: 'gu' },
      }),
    );

    const body = bodyOf<AnalysisResponse>(response);
    expect(body.language).toBe('gu');
    expect(body.findings.map((finding) => finding.text.title).join(' ')).toMatch(/[઀-૿]/);
  });

  it('returns 404 for an analysis that does not exist', async () => {
    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: OTHER_ANALYSIS_ID } }),
    );

    expect(result(response).statusCode).toBe(404);
    expect(bodyOf<ApiError>(response).error.code).toBe('not_found');
  });

  it('treats an analysis past its expiry as gone', async () => {
    await analysesHandler(createAnalysisEvent());
    const stored = dynamo.items.get(`analysis#${ANALYSIS_ID}`)!;
    stored.expiresAt = Math.floor(Date.now() / 1000) - 60;

    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );

    expect(result(response).statusCode).toBe(404);
  });

  it('rejects a malformed analysis id', async () => {
    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: 'not-an-id' } }),
    );

    expect(result(response).statusCode).toBe(400);
  });
});

describe('DELETE /analyses/{analysisId}', () => {
  it('deletes the uploads and the stored result, and the analysis cannot be reopened', async () => {
    await analysesHandler(createAnalysisEvent());
    expect(dynamo.items.has(`analysis#${ANALYSIS_ID}`)).toBe(true);

    const response = await analysisHandler(
      event('DELETE /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );

    expect(result(response).statusCode).toBe(204);
    expect(dynamo.items.has(`analysis#${ANALYSIS_ID}`)).toBe(false);
    expect(s3.deletedKeys.sort()).toEqual(
      [MARKSHEET_KEY, INCOME_KEY, BANK_KEY, BANK_REPLACEMENT_KEY].sort(),
    );

    const afterDelete = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );
    expect(result(afterDelete).statusCode).toBe(404);
  });

  it('only deletes objects under its own analysis prefix', async () => {
    const otherKey = key(OTHER_ANALYSIS_ID, 'bank_proof', '8888888888888888');
    s3.objects.set(otherKey, IMAGE);
    await analysesHandler(createAnalysisEvent());

    await analysisHandler(
      event('DELETE /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );

    expect(s3.deletedKeys).not.toContain(otherKey);
    expect(s3.objects.has(otherKey)).toBe(true);
  });

  it('succeeds when there is nothing left to delete', async () => {
    const response = await analysisHandler(
      event('DELETE /analyses/{analysisId}', { pathParameters: { analysisId: OTHER_ANALYSIS_ID } }),
    );

    expect(result(response).statusCode).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// Health and cross-cutting guarantees
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('reports liveness and the template version, and nothing sensitive', async () => {
    const response = await healthHandler(event('GET /health'));
    const raw = result(response).body ?? '';

    expect(result(response).statusCode).toBe(200);
    expect(JSON.parse(raw)).toMatchObject({ status: 'ok', templateVersion: '1.0.0' });
    expect(raw).not.toContain('kagazready-test-bucket');
    expect(raw).not.toContain('kagazready-test-table');
    expect(raw).not.toContain('ap-south-1');
    expect(raw).not.toContain('arn:');
  });
});

describe('cross-cutting guarantees', () => {
  it('sends the exact allowed origin, never a wildcard', async () => {
    const response = await healthHandler(event('GET /health'));

    expect(result(response).headers?.['access-control-allow-origin']).toBe(
      'https://kagazready.example',
    );
  });

  it('sends hardening headers on every response', async () => {
    const headers = result(await healthHandler(event('GET /health'))).headers ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['cache-control']).toBe('no-store');
    expect(headers['strict-transport-security']).toContain('max-age=');
  });

  it('gives every response a correlation id', async () => {
    const response = await healthHandler(event('GET /health'));

    expect(result(response).headers?.['x-correlation-id']).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns a safe generic error when a handler hits an unexpected failure', async () => {
    setDocumentClient({
      send: async () => {
        throw new Error('table kagazready-test-table is on fire at /var/task/index.js:42');
      },
    } as never);

    const response = await analysisHandler(
      event('GET /analyses/{analysisId}', { pathParameters: { analysisId: ANALYSIS_ID } }),
    );
    const raw = result(response).body ?? '';

    expect(result(response).statusCode).toBe(500);
    expect(bodyOf<ApiError>(response).error.code).toBe('internal_error');
    expect(raw).not.toContain('kagazready-test-table');
    expect(raw).not.toContain('/var/task');
    expect(raw).not.toContain('on fire');
  });

  it('routes an unknown route to a not found rather than a crash', async () => {
    const response = await analysesHandler(event('PATCH /analyses'));

    expect(result(response).statusCode).toBe(404);
  });
});
