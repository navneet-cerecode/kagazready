import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract';
import {
  SCHOLARSHIP_READINESS_TEMPLATE,
  type DocumentType,
  type Finding,
  type RuleId,
} from '@kagazready/contracts';
import { analyze, type OcrDocument, type OcrLine } from '@kagazready/rules';
import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JavaScript module, no types needed for a fixture renderer
import {
  ACCOUNT_NUMBER_QUALITIES,
  renderBankProof,
  renderIncomeCertificate,
  renderMarksheet,
} from './documents.mjs';

/**
 * The real Amazon Textract test, and the calibration tool for the demo fixtures.
 *
 * Opt-in: it calls a paid AWS API, so it only runs with RUN_AWS_TESTS=1 and working credentials.
 *
 *   RUN_AWS_TESTS=1 npm run test -w @kagazready/fixtures
 *
 * The point of the calibration case is honesty. The demo needs an "unclear field" finding, and
 * there are two ways to produce one: degrade the image until Textract genuinely reports low
 * confidence, or lower the rule threshold until whatever Textract returns counts as low. Only the
 * first is a real result, so the threshold stays fixed and the image is the variable.
 */

const LIVE = process.env.RUN_AWS_TESTS === '1';
const describeLive = LIVE ? describe : describe.skip;

const template = SCHOLARSHIP_READINESS_TEMPLATE;
const REGION = process.env.AWS_REGION ?? 'ap-south-1';
const textract = new TextractClient({ region: REGION });

const ACCOUNT_FIELD = template.requiredDocuments
  .find((document) => document.documentType === 'bank_proof')!
  .expectedFields.find((field) => field.fieldId === 'bank_account_number')!;

const ACCOUNT_DIGITS = '304988127745';

/**
 * Quality used for the needs-review fixture, chosen from the measurements below.
 *
 * `scratched` is measured at roughly 62% confidence, well under the 88% threshold, and Textract
 * also misreads one digit: 3049 8812 7745 comes back as 3049 0812 7745.
 *
 * That misread is the reason this is the right fixture rather than a problem with it. A value that
 * OCR is unsure about and in fact got wrong is exactly what the confidence rule exists to catch,
 * and the product never claims the value is correct — it says the field is hard to read and asks
 * for a clearer photo. The masked evidence shown to the user is the last four digits, which are
 * read correctly here, so nothing incorrect is displayed.
 *
 * Rejected alternatives, all measured: `faint` and `pixelated-4x` were not detected at all, which
 * would report a missing field instead of an unclear one; `clean`, `pixelated-2x` and
 * `pixelated-3x` were read at 98-99% confidence.
 */
export const NEEDS_REVIEW_QUALITY = 'scratched';

const digitsOnly = (value: string) => value.replace(/\D+/gu, '');

/**
 * The line carrying the account-number digits.
 *
 * Excludes MICR explicitly: during calibration, when the account number failed to be detected at
 * all, a looser match silently picked up the nine-digit MICR line instead and reported a healthy
 * confidence for the wrong line.
 */
const accountValueLine = (lines: OcrLine[]): OcrLine | undefined =>
  lines.find(
    (line) =>
      digitsOnly(line.text).length >= 8 &&
      !/account/iu.test(line.text) &&
      !/micr/iu.test(line.text),
  );

async function ocrLines(png: Buffer): Promise<OcrLine[]> {
  const response = await textract.send(new DetectDocumentTextCommand({ Document: { Bytes: png } }));
  return (response.Blocks ?? [])
    .filter((block) => block.BlockType === 'LINE')
    .flatMap((block) =>
      typeof block.Text === 'string' && block.Text.trim() !== ''
        ? [{ text: block.Text, confidence: block.Confidence ?? 0 }]
        : [],
    );
}

const asDocument = async (documentType: DocumentType, png: Buffer): Promise<OcrDocument> => ({
  documentType,
  lines: await ocrLines(png),
});

const ruleIds = (findings: Finding[]): RuleId[] => findings.map((f) => f.ruleId).sort();

describeLive('real Textract — fixture calibration', () => {
  it('reports the measured confidence for every degradation level', async () => {
    const measurements: string[] = [];
    const qualities = ACCOUNT_NUMBER_QUALITIES as string[];

    for (const quality of qualities) {
      const lines = await ocrLines(renderBankProof({ accountNumberQuality: quality }));
      const label = lines.find((line) => /account\s*number/iu.test(line.text));
      const value = accountValueLine(lines);
      const correct = value ? digitsOnly(value.text) === ACCOUNT_DIGITS : false;

      measurements.push(
        `${quality.padEnd(24)} label ${label ? `${label.confidence.toFixed(1)}%` : 'MISSING'}, ` +
          `value ${value ? `${value.confidence.toFixed(1)}%` : 'MISSING'}, ` +
          `text "${value?.text.trim() ?? '-'}", read correctly: ${correct}`,
      );
    }

    const report = [
      `Measured against real Amazon Textract in ${REGION} on ${new Date().toISOString()}`,
      `Threshold for bank_account_number: ${ACCOUNT_FIELD.minOcrConfidence}%`,
      '',
      ...measurements,
    ].join('\n');

    // Written to a file as well as logged, so the chosen level is justified by a measurement that
    // can be quoted in VERIFICATION.md rather than by assertion.
    await mkdir('out', { recursive: true });
    await writeFile('out/calibration.txt', `${report}\n`, 'utf8');
    console.log(report);

    expect(measurements).toHaveLength(qualities.length);
  }, 120_000);

  it('the chosen quality is detected, below the threshold, and safe to display', async () => {
    const lines = await ocrLines(renderBankProof({ accountNumberQuality: NEEDS_REVIEW_QUALITY }));
    const value = accountValueLine(lines);

    expect(value, 'the account number line must still be detected').toBeDefined();
    expect(value!.confidence).toBeLessThan(ACCOUNT_FIELD.minOcrConfidence);

    // Still long enough to look like an account number, so the finding is "unclear" rather than
    // "missing" or "implausible".
    expect(digitsOnly(value!.text).length).toBeGreaterThanOrEqual(9);

    // The last four digits are the only part shown to the user, so they must be right. If this
    // ever fails, re-run the calibration case and pick another quality — never lower the threshold.
    expect(digitsOnly(value!.text).slice(-4)).toBe(ACCOUNT_DIGITS.slice(-4));
  }, 120_000);

  it('a clean bank proof is read above the threshold', async () => {
    const lines = await ocrLines(renderBankProof({ accountNumberQuality: 'clean' }));
    const value = accountValueLine(lines);

    expect(digitsOnly(value!.text)).toBe(ACCOUNT_DIGITS);
    expect(value!.confidence).toBeGreaterThanOrEqual(ACCOUNT_FIELD.minOcrConfidence);
  }, 120_000);
});

describeLive('real Textract — the demo journey', () => {
  it('scenario A produces exactly the name mismatch and the unclear account number', async () => {
    const documents = await Promise.all([
      asDocument('class_xii_marksheet', renderMarksheet()),
      asDocument('income_certificate', renderIncomeCertificate()),
      asDocument(
        'bank_proof',
        renderBankProof({
          accountHolderName: 'Priya Rameshbhai Shah',
          accountNumberQuality: NEEDS_REVIEW_QUALITY,
        }),
      ),
    ]);

    const outcome = analyze({ documents, template, now: new Date() });

    console.log(
      `scenario A: ${outcome.overallStatus} — ${ruleIds(outcome.findings).join(', ') || 'no findings'}`,
    );

    expect(ruleIds(outcome.findings)).toEqual([
      'field_unclear_low_confidence',
      'name_material_difference',
    ]);
    expect(outcome.overallStatus).toBe('needs_review');
  }, 180_000);

  it('scenario B, the corrected set, reaches no issues found', async () => {
    const documents = await Promise.all([
      asDocument('class_xii_marksheet', renderMarksheet()),
      asDocument('income_certificate', renderIncomeCertificate()),
      asDocument('bank_proof', renderBankProof()),
    ]);

    const outcome = analyze({ documents, template, now: new Date() });

    console.log(
      `scenario B: ${outcome.overallStatus} — ${ruleIds(outcome.findings).join(', ') || 'no findings'}`,
    );

    expect(outcome.findings).toEqual([]);
    expect(outcome.overallStatus).toBe('no_issues_found');
  }, 180_000);

  it('every required field is extracted from the real OCR output', async () => {
    const documents = await Promise.all([
      asDocument('class_xii_marksheet', renderMarksheet()),
      asDocument('income_certificate', renderIncomeCertificate()),
      asDocument('bank_proof', renderBankProof()),
    ]);

    const outcome = analyze({ documents, template, now: new Date() });

    for (const required of template.requiredDocuments) {
      const reading = outcome.readings.find(
        (entry) => entry.documentType === required.documentType,
      );
      const found = new Set(reading?.fields.map((field) => field.fieldId));
      for (const field of required.expectedFields.filter((f) => f.required)) {
        expect(found, `${required.documentType}.${field.fieldId} should be extracted`).toContain(
          field.fieldId,
        );
      }
    }
  }, 180_000);

  it('the account number is masked in the readings taken from real OCR', async () => {
    const documents = [await asDocument('bank_proof', renderBankProof())];
    const outcome = analyze({ documents, template, now: new Date() });
    const serialized = JSON.stringify(outcome);

    expect(serialized).not.toContain(ACCOUNT_DIGITS);
    expect(serialized).not.toContain('3049 8812 7745');
    expect(serialized).toContain('XXXXXXXX7745');
  }, 120_000);
});

describe('fixture content rules', () => {
  it('is skipped unless RUN_AWS_TESTS=1', () => {
    // Documents the opt-in, and keeps this file from reporting zero tests in a normal run.
    expect(typeof LIVE).toBe('boolean');
  });
});
