import { describe, expect, it } from 'vitest';
import {
  AnalysisIdSchema,
  BedrockExplanationResponseSchema,
  FORBIDDEN_EXPLANATION_TERMS,
  ObjectKeySchema,
  SCHOLARSHIP_READINESS_TEMPLATE,
  TemplateSchema,
} from './index.js';

const ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('AnalysisIdSchema', () => {
  it('accepts 32 lowercase hex characters and nothing else', () => {
    expect(AnalysisIdSchema.safeParse(ID).success).toBe(true);
    expect(AnalysisIdSchema.safeParse(ID.toUpperCase()).success).toBe(false);
    expect(AnalysisIdSchema.safeParse(ID.slice(1)).success).toBe(false);
    expect(AnalysisIdSchema.safeParse(`${ID}/`).success).toBe(false);
  });
});

describe('ObjectKeySchema', () => {
  it('accepts a server-shaped key', () => {
    expect(ObjectKeySchema.safeParse(`uploads/${ID}/bank_proof/0123456789abcdef.png`).success).toBe(
      true,
    );
  });

  it('rejects traversal, foreign prefixes, unknown document types and other extensions', () => {
    for (const key of [
      `uploads/${ID}/bank_proof/../class_xii_marksheet/0123456789abcdef.png`,
      `private/${ID}/bank_proof/0123456789abcdef.png`,
      `uploads/${ID}/aadhaar/0123456789abcdef.png`,
      `uploads/${ID}/bank_proof/0123456789abcdef.pdf`,
      `uploads/${ID}/bank_proof/0123456789abcdef.png?x=1`,
    ]) {
      expect(ObjectKeySchema.safeParse(key).success, key).toBe(false);
    }
  });
});

describe('BedrockExplanationResponseSchema', () => {
  const ok = (explanation: string) =>
    BedrockExplanationResponseSchema.safeParse({
      explanations: [
        { findingId: 'field_unclear_low_confidence:bank_proof:bank_account_number', explanation },
      ],
    }).success;

  it('accepts a plain restatement', () => {
    expect(ok('The account number was hard to read. A clearer photo usually fixes this.')).toBe(
      true,
    );
  });

  it('rejects every decision word in every language, regardless of case', () => {
    for (const term of FORBIDDEN_EXPLANATION_TERMS) {
      expect(ok(`Your document is ${term}.`), term).toBe(false);
      expect(ok(`Your document is ${term.toUpperCase()}.`), term).toBe(false);
    }
  });

  it('rejects empty, oversized and over-long lists', () => {
    expect(ok('')).toBe(false);
    expect(ok('x'.repeat(321))).toBe(false);
    expect(
      BedrockExplanationResponseSchema.safeParse({
        explanations: Array.from({ length: 21 }, (_, i) => ({
          findingId: `f${i}`,
          explanation: 'ok',
        })),
      }).success,
    ).toBe(false);
  });
});

describe('SCHOLARSHIP_READINESS_TEMPLATE', () => {
  it('is a valid template that never asks for Aadhaar', () => {
    expect(TemplateSchema.safeParse(SCHOLARSHIP_READINESS_TEMPLATE).success).toBe(true);
    expect(JSON.stringify(SCHOLARSHIP_READINESS_TEMPLATE).toLowerCase()).not.toContain('aadhaar');
  });

  it('accepts only JPEG and PNG at 5 MB, three documents at most', () => {
    const { uploadConstraints } = SCHOLARSHIP_READINESS_TEMPLATE;
    expect(uploadConstraints.acceptedContentTypes).toEqual(['image/jpeg', 'image/png']);
    expect(uploadConstraints.maxFileBytes).toBe(5 * 1024 * 1024);
    expect(uploadConstraints.maxDocumentsPerAnalysis).toBe(3);
  });
});
