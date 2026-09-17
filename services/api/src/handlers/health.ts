import { SCHOLARSHIP_READINESS_TEMPLATE, type HealthResponse } from '@kagazready/contracts';
import { jsonResponse, withHttp } from '../http.js';

/**
 * GET /health
 *
 * Deliberately boring. It reports that the service is up and which template version it is serving,
 * and nothing else: no account ID, no bucket or table name, no region, no configuration, no build
 * paths. A health endpoint is the most-probed endpoint on any deployment.
 */
export const handler = withHttp('GET /health', async (_event, correlationId) => {
  const response: HealthResponse = {
    status: 'ok',
    templateId: SCHOLARSHIP_READINESS_TEMPLATE.id,
    templateVersion: SCHOLARSHIP_READINESS_TEMPLATE.version,
    timeUtc: new Date().toISOString(),
  };

  return jsonResponse(200, response, correlationId);
});
