import { randomBytes } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { redactDigitRuns } from '@kagazready/rules';
import { z } from 'zod';
import type { ErrorCode } from '@kagazready/contracts';
import { config } from './config.js';

/**
 * HTTP plumbing: correlation IDs, safe errors, CORS, and structured logging.
 *
 * Two rules hold everywhere in this file. Clients get a generic message and a correlation ID;
 * CloudWatch gets the detail. And nothing that could carry document content is logged without
 * passing through `redactDigitRuns` first.
 */

export function newCorrelationId(): string {
  return randomBytes(8).toString('hex');
}

/** Errors thrown deliberately by a handler, with a client-safe message. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    /** Shown to the user. Must contain no internal detail. */
    readonly publicMessage: string,
    /** Logged, never returned. */
    readonly internalDetail?: string,
  ) {
    super(publicMessage);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, detail?: string) =>
  new HttpError(400, 'validation_error', message, detail);

export const notFound = (message = 'That analysis could not be found. It may have expired.') =>
  new HttpError(404, 'not_found', message);

export const conflict = (message: string) => new HttpError(409, 'conflict', message);

export const capacityReached = () =>
  new HttpError(
    429,
    'capacity_reached',
    'This demo has reached its limit of checks for today. Please try again tomorrow.',
  );

export const upstreamUnavailable = (detail?: string) =>
  new HttpError(
    503,
    'upstream_unavailable',
    'The document reading service is temporarily unavailable. Please try again in a moment.',
    detail,
  );

interface LogFields {
  [key: string]: unknown;
}

export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  fields: LogFields = {},
): void {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = typeof value === 'string' ? redactDigitRuns(value) : value;
  }
  // Single-line JSON so CloudWatch Logs Insights can query it.
  process.stdout.write(`${JSON.stringify({ level, message, ...safe })}\n`);
}

function securityHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
  };
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': config().allowedOrigin,
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-max-age': '600',
    vary: 'origin',
  };
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  correlationId: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { ...securityHeaders(), ...corsHeaders(), 'x-correlation-id': correlationId },
    body: JSON.stringify(body),
  };
}

export function noContentResponse(correlationId: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: { ...corsHeaders(), 'x-correlation-id': correlationId },
    body: '',
  };
}

/** Parse and validate a JSON request body. The only place untrusted input enters a handler. */
export function parseBody<T extends z.ZodTypeAny>(
  event: APIGatewayProxyEventV2,
  schema: T,
): z.infer<T> {
  if (!event.body) throw badRequest('A request body is required.');

  let raw: unknown;
  try {
    raw = JSON.parse(
      event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body,
    );
  } catch {
    throw badRequest('The request body is not valid JSON.');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    // The issue paths name our own field names, which is safe and genuinely useful to a caller.
    const fields = result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean);
    throw badRequest(
      fields.length > 0
        ? `These values are missing or not valid: ${[...new Set(fields)].join(', ')}.`
        : 'The request body is not valid.',
    );
  }
  return result.data;
}

/** Validate a path parameter. */
export function parsePathParam<T extends z.ZodTypeAny>(
  event: APIGatewayProxyEventV2,
  name: string,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(event.pathParameters?.[name]);
  if (!result.success) throw badRequest(`The ${name} in the URL is not valid.`);
  return result.data;
}

/**
 * Wraps a handler so that every path returns a well-formed response.
 *
 * An `HttpError` becomes its intended status. Anything else becomes a 500 with a generic message:
 * an unexpected error must never leak a stack trace, a bucket name, or an account ID to a caller.
 */
export function withHttp(
  routeName: string,
  handler: (
    event: APIGatewayProxyEventV2,
    correlationId: string,
  ) => Promise<APIGatewayProxyResultV2>,
) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const correlationId = newCorrelationId();
    const started = Date.now();

    try {
      const response = await handler(event, correlationId);
      log('info', 'request completed', {
        route: routeName,
        correlationId,
        durationMs: Date.now() - started,
      });
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        log(error.statusCode >= 500 ? 'error' : 'warn', 'request rejected', {
          route: routeName,
          correlationId,
          statusCode: error.statusCode,
          code: error.code,
          detail: error.internalDetail,
          durationMs: Date.now() - started,
        });
        return jsonResponse(
          error.statusCode,
          { error: { code: error.code, message: error.publicMessage, correlationId } },
          correlationId,
        );
      }

      log('error', 'unhandled error', {
        route: routeName,
        correlationId,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
      });

      return jsonResponse(
        500,
        {
          error: {
            code: 'internal_error',
            message: 'Something went wrong on our side. Please try again.',
            correlationId,
          },
        },
        correlationId,
      );
    }
  };
}
