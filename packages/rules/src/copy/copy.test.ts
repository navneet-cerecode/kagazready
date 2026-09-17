import {
  DOCUMENT_TYPES,
  FIELD_IDS,
  LANGUAGES,
  OVERALL_STATUSES,
  RULE_IDS,
  SCHOLARSHIP_READINESS_TEMPLATE,
  type Language,
} from '@kagazready/contracts';
import { describe, expect, it } from 'vitest';
import { analyze } from '../analyze.js';
import { scenarioANeedsReview } from '../testing/ocrFixtures.js';
import { copyFor, fallbackExplanation, renderFinding, statusCopy } from './index.js';

/**
 * Words the product must never show, in any language. `Verified` and friends would claim an
 * authority KagazReady does not have.
 */
const FORBIDDEN = [
  'approved',
  'eligible',
  'verified',
  'guaranteed',
  'rejected',
  'स्वीकृत',
  'पात्र',
  'सत्यापित',
  'गारंटी',
  'अस्वीकृत',
  'મંજૂર',
  'પાત્ર',
  'ચકાસાયેલ',
  'ગેરંટી',
  'નામંજૂર',
];

const allCopyStrings = (language: Language): string[] => {
  const copy = copyFor(language);
  return [
    ...Object.values(copy.documentTypes),
    ...Object.values(copy.fields),
    ...Object.values(copy.statuses).flatMap((status) => [status.label, status.summary]),
    ...Object.values(copy.rules).flatMap((rule) => [rule.title, rule.reason, rule.suggestedAction]),
  ];
};

describe.each(LANGUAGES)('copy completeness — %s', (language) => {
  const copy = copyFor(language);

  it('covers every document type', () => {
    for (const documentType of DOCUMENT_TYPES) {
      expect(copy.documentTypes[documentType]).toBeTruthy();
    }
  });

  it('covers every field', () => {
    for (const fieldId of FIELD_IDS) {
      expect(copy.fields[fieldId]).toBeTruthy();
    }
  });

  it('covers every overall status', () => {
    for (const status of OVERALL_STATUSES) {
      expect(statusCopy(status, language).label).toBeTruthy();
      expect(statusCopy(status, language).summary).toBeTruthy();
    }
  });

  it('covers every rule with a title, a reason and an action', () => {
    for (const ruleId of RULE_IDS) {
      const rule = copy.rules[ruleId];
      expect(rule.title).toBeTruthy();
      expect(rule.reason).toBeTruthy();
      expect(rule.suggestedAction).toBeTruthy();
    }
  });

  it('never uses a word that implies an application decision', () => {
    for (const text of allCopyStrings(language)) {
      for (const term of FORBIDDEN) {
        expect(text.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

describe('renderFinding', () => {
  const outcome = analyze({
    documents: scenarioANeedsReview(),
    template: SCHOLARSHIP_READINESS_TEMPLATE,
    now: new Date('2026-09-17T10:00:00Z'),
  });

  it.each(LANGUAGES)('leaves no placeholder unresolved in %s', (language) => {
    for (const finding of outcome.findings) {
      const text = renderFinding(finding, language);
      for (const value of [text.title, text.reason, text.suggestedAction]) {
        expect(value).not.toMatch(/\{[a-zA-Z]+\}/u);
      }
    }
  });

  it('substitutes the localized document label, not the raw key', () => {
    const finding = outcome.findings.find((f) => f.ruleId === 'name_material_difference');
    expect(finding).toBeDefined();

    expect(renderFinding(finding!, 'en').reason).toContain('Bank proof');
    expect(renderFinding(finding!, 'en').reason).toContain(
      'Class XII marksheet and Income certificate',
    );
    expect(renderFinding(finding!, 'hi').reason).toContain('बैंक प्रमाण');
    expect(renderFinding(finding!, 'gu').reason).toContain('બેંક પુરાવો');
  });

  it('substitutes the localized field label', () => {
    const finding = outcome.findings.find((f) => f.ruleId === 'field_unclear_low_confidence');
    expect(finding).toBeDefined();

    expect(renderFinding(finding!, 'en').title).toBe('Hard to read: account number');
    expect(renderFinding(finding!, 'hi').title).toBe('पढ़ने में मुश्किल: खाता संख्या');
    expect(renderFinding(finding!, 'gu').title).toBe('વાંચવું મુશ્કેલ: ખાતા નંબર');
  });

  it('keeps the masked account number masked in the rendered text', () => {
    const finding = outcome.findings.find((f) => f.ruleId === 'field_unclear_low_confidence');
    const rendered = JSON.stringify(renderFinding(finding!, 'en'));

    expect(rendered).not.toContain('7745');
  });

  it('reports the real confidence and threshold in the reason', () => {
    const finding = outcome.findings.find((f) => f.ruleId === 'field_unclear_low_confidence');

    expect(renderFinding(finding!, 'en').reason).toContain('61%');
    expect(renderFinding(finding!, 'en').reason).toContain('88%');
  });
});

describe('fallbackExplanation', () => {
  it('has a reviewed English explanation for every rule', () => {
    for (const ruleId of RULE_IDS) {
      expect(fallbackExplanation(ruleId).length).toBeGreaterThan(20);
    }
  });

  it('never uses a word that implies an application decision', () => {
    for (const ruleId of RULE_IDS) {
      for (const term of FORBIDDEN) {
        expect(fallbackExplanation(ruleId).toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});
