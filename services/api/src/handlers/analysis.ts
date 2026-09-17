import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AnalysisIdSchema, LanguageSchema } from '@kagazready/contracts';
import { deleteAnalysis, getAnalysis, putExplanations } from '../adapters/store.js';
import { deleteAnalysisObjects } from '../adapters/s3.js';
import {
  conflict,
  jsonResponse,
  log,
  noContentResponse,
  notFound,
  parsePathParam,
  withHttp,
} from '../http.js';
import { presentAnalysis } from '../present.js';

/**
 * Reads and deletions.
 *
 * This function deliberately has no Textract or Bedrock permissions, and cannot start an analysis.
 * The most it can do with an analysis ID is show the result or destroy it.
 */

/** GET /analyses/{analysisId}?language=hi */
async function readAnalysis(
  event: APIGatewayProxyEventV2,
  correlationId: string,
): Promise<APIGatewayProxyResultV2> {
  const analysisId = parsePathParam(event, 'analysisId', AnalysisIdSchema);
  const stored = await getAnalysis(analysisId);

  if (!stored) throw notFound();
  if (stored.state === 'processing' || !stored.outcome) {
    throw conflict('That check is still being processed. Please wait a moment.');
  }

  // An unrecognised language falls back to the language the analysis was run in rather than
  // failing: the result is still correct, just not in the language that was asked for.
  const requested = LanguageSchema.safeParse(event.queryStringParameters?.language);
  const language = requested.success ? requested.data : stored.language;

  const presented = await presentAnalysis(stored, language);

  // Explanations for a newly requested language are cached so switching back is free.
  if (presented.generatedExplanations) {
    await putExplanations(analysisId, language, presented.generatedExplanations);
  }

  return jsonResponse(200, presented.response, correlationId);
}

/**
 * DELETE /analyses/{analysisId}
 *
 * Deletes the uploaded images first, then the stored result. Objects are removed by prefix derived
 * from the analysis ID, so this can only ever affect the analysis named in the URL. Deleting
 * something that is already gone succeeds: a user who clicks delete twice should not see an error.
 */
async function removeAnalysis(
  event: APIGatewayProxyEventV2,
  correlationId: string,
): Promise<APIGatewayProxyResultV2> {
  const analysisId = parsePathParam(event, 'analysisId', AnalysisIdSchema);

  const objectsDeleted = await deleteAnalysisObjects(analysisId);
  await deleteAnalysis(analysisId);

  log('info', 'analysis deleted', { correlationId, analysisId, objectsDeleted });

  return noContentResponse(correlationId);
}

export const handler = withHttp('analysis (read/delete)', async (event, correlationId) => {
  const route = event.routeKey ?? `${event.requestContext?.http?.method ?? ''} ${event.rawPath}`;

  if (route.startsWith('GET /analyses')) return readAnalysis(event, correlationId);
  if (route.startsWith('DELETE /analyses')) return removeAnalysis(event, correlationId);

  throw notFound('That endpoint does not exist.');
});
