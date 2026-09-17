import { z } from 'zod';

/**
 * Configuration read from the Lambda environment.
 *
 * Parsed once per cold start and validated, so a misconfigured deployment fails immediately and
 * loudly instead of producing confusing behaviour under load. No secrets live here — every AWS call
 * uses the function's execution role.
 */

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const EnvSchema = z.object({
  UPLOAD_BUCKET: z.string().min(1),
  TABLE_NAME: z.string().min(1),

  /** Region for S3, Textract and DynamoDB. Supplied by the Lambda runtime. */
  AWS_REGION: z.string().min(1),

  /** Bedrock can live in a different region from the rest of the stack. */
  BEDROCK_REGION: z.string().min(1).optional(),
  /**
   * Verified per account and region with `aws bedrock list-foundation-models`. There is deliberately
   * no default: a wrong guess would either fail at runtime or silently pick an expensive model.
   * When unset, explanations fall back to reviewed English copy and the analysis still works.
   */
  BEDROCK_MODEL_ID: z.string().min(1).optional(),

  /** Exact frontend origin allowed to call the API. `*` is rejected outside local development. */
  ALLOWED_ORIGIN: z.string().min(1),

  PRESIGN_EXPIRY_SECONDS: positiveInt(120),
  /** Stored results expire well inside 24 hours. */
  ANALYSIS_TTL_SECONDS: positiveInt(6 * 60 * 60),
  /** Hard ceiling on analyses per UTC day, so a public demo cannot drain the AWS credits. */
  DAILY_ANALYSIS_CAP: positiveInt(150),

  STAGE: z.enum(['dev', 'prod']).default('dev'),
});

export interface Config {
  uploadBucket: string;
  tableName: string;
  region: string;
  bedrockRegion: string;
  bedrockModelId: string | undefined;
  allowedOrigin: string;
  presignExpirySeconds: number;
  analysisTtlSeconds: number;
  dailyAnalysisCap: number;
  stage: 'dev' | 'prod';
}

const MAX_TTL_SECONDS = 24 * 60 * 60;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  if (parsed.ANALYSIS_TTL_SECONDS > MAX_TTL_SECONDS) {
    throw new Error('ANALYSIS_TTL_SECONDS must not exceed 24 hours');
  }
  if (parsed.STAGE === 'prod' && parsed.ALLOWED_ORIGIN === '*') {
    throw new Error('ALLOWED_ORIGIN must name an exact origin in production');
  }

  return {
    uploadBucket: parsed.UPLOAD_BUCKET,
    tableName: parsed.TABLE_NAME,
    region: parsed.AWS_REGION,
    bedrockRegion: parsed.BEDROCK_REGION ?? parsed.AWS_REGION,
    bedrockModelId: parsed.BEDROCK_MODEL_ID,
    allowedOrigin: parsed.ALLOWED_ORIGIN,
    presignExpirySeconds: parsed.PRESIGN_EXPIRY_SECONDS,
    analysisTtlSeconds: parsed.ANALYSIS_TTL_SECONDS,
    dailyAnalysisCap: parsed.DAILY_ANALYSIS_CAP,
    stage: parsed.STAGE,
  };
}

let cached: Config | undefined;

/** Cached across invocations within one execution environment. */
export function config(): Config {
  cached ??= loadConfig();
  return cached;
}

/** Test seam: drop the cached config so a test can change the environment. */
export function resetConfigCache(): void {
  cached = undefined;
}
