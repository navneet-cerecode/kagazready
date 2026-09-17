import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

/**
 * These tests exist because of a real deployment failure.
 *
 * CloudFormation passes an unset template parameter to Lambda as an empty string. `BEDROCK_MODEL_ID`
 * was declared `z.string().min(1).optional()`, which accepts "absent" but rejects "empty", so config
 * parsing threw on every invocation of the two functions that carry the variable — while every local
 * test passed, because tests deleted the variable rather than setting it to "".
 */

const baseEnv = {
  UPLOAD_BUCKET: 'bucket',
  TABLE_NAME: 'table',
  AWS_REGION: 'ap-south-1',
  ALLOWED_ORIGIN: 'https://kagazready.example',
};

describe('loadConfig — optional Bedrock settings', () => {
  it('treats an empty BEDROCK_MODEL_ID as not configured', () => {
    const config = loadConfig({ ...baseEnv, BEDROCK_MODEL_ID: '' });

    expect(config.bedrockModelId).toBeUndefined();
  });

  it('treats a whitespace-only BEDROCK_MODEL_ID as not configured', () => {
    expect(loadConfig({ ...baseEnv, BEDROCK_MODEL_ID: '   ' }).bedrockModelId).toBeUndefined();
  });

  it('treats an absent BEDROCK_MODEL_ID as not configured', () => {
    expect(loadConfig(baseEnv).bedrockModelId).toBeUndefined();
  });

  it('keeps a real model ID', () => {
    expect(
      loadConfig({ ...baseEnv, BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0' })
        .bedrockModelId,
    ).toBe('anthropic.claude-3-haiku-20240307-v1:0');
  });

  it('falls back to the stack region when BEDROCK_REGION is empty', () => {
    expect(loadConfig({ ...baseEnv, BEDROCK_REGION: '' }).bedrockRegion).toBe('ap-south-1');
  });

  it('uses BEDROCK_REGION when it is set', () => {
    expect(loadConfig({ ...baseEnv, BEDROCK_REGION: 'us-east-1' }).bedrockRegion).toBe('us-east-1');
  });
});

describe('loadConfig — guard rails', () => {
  it('rejects a wildcard origin in production', () => {
    expect(() => loadConfig({ ...baseEnv, ALLOWED_ORIGIN: '*', STAGE: 'prod' })).toThrow(
      /exact origin/,
    );
  });

  it('allows a wildcard origin outside production', () => {
    expect(loadConfig({ ...baseEnv, ALLOWED_ORIGIN: '*', STAGE: 'dev' }).allowedOrigin).toBe('*');
  });

  it('rejects a retention window longer than 24 hours', () => {
    expect(() => loadConfig({ ...baseEnv, ANALYSIS_TTL_SECONDS: '90000' })).toThrow(/24 hours/);
  });

  it('requires the bucket and table to be named', () => {
    expect(() => loadConfig({ ...baseEnv, UPLOAD_BUCKET: '' })).toThrow();
    expect(() => loadConfig({ ...baseEnv, TABLE_NAME: '' })).toThrow();
  });

  it('defaults the daily cap and retention to bounded values', () => {
    const config = loadConfig(baseEnv);

    expect(config.dailyAnalysisCap).toBeGreaterThan(0);
    expect(config.analysisTtlSeconds).toBeLessThanOrEqual(24 * 60 * 60);
  });
});
