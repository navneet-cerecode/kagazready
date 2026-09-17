import { SCHOLARSHIP_READINESS_TEMPLATE } from '@kagazready/contracts';
import { describe, expect, it } from 'vitest';
import { extractFields, type OcrDocument } from './extract.js';
import { bankDocument, marksheetDocument } from './testing/ocrFixtures.js';

const template = SCHOLARSHIP_READINESS_TEMPLATE;

const bankDoc = (lines: [string, number][]): OcrDocument => ({
  documentType: 'bank_proof',
  lines: lines.map(([text, confidence]) => ({ text, confidence })),
});

describe('extractFields', () => {
  it('reads a labelled value from the same line', () => {
    const fields = extractFields(marksheetDocument(), template);

    expect(fields.marksheet_candidate_name?.value).toBe('Priya Rameshbhai Patel');
    expect(fields.marksheet_roll_number?.value).toBe('GJ2024881234');
    expect(fields.marksheet_exam_year?.value).toBe('2024');
  });

  it('reads a value that sits on the line below its label', () => {
    const fields = extractFields(
      bankDoc([
        ['Account Number:', 98],
        ['3049 8812 7745', 91],
      ]),
      template,
    );

    expect(fields.bank_account_number?.value).toBe('3049 8812 7745');
    expect(fields.bank_account_number?.confidence).toBe(91);
  });

  it('reads a label with no colon followed by its value on the same line', () => {
    const fields = extractFields(bankDoc([['IFSC SYNB0001234', 95]]), template);

    expect(fields.bank_ifsc?.value).toBe('SYNB0001234');
  });

  it('reports the confidence of the line the value came from, not the label line', () => {
    const fields = extractFields(
      bankDoc([
        ['IFSC', 99],
        ['SYNB0001234', 71],
      ]),
      template,
    );

    expect(fields.bank_ifsc?.confidence).toBe(71);
  });

  it('lets the most specific label claim a line, so "bank name" does not lose to "name"', () => {
    const fields = extractFields(
      bankDoc([
        ['Bank Name: Synthetic State Bank', 97],
        ['Name: Priya Rameshbhai Patel', 96],
      ]),
      template,
    );

    expect(fields.bank_name?.value).toBe('Synthetic State Bank');
    expect(fields.bank_account_holder_name?.value).toBe('Priya Rameshbhai Patel');
  });

  it('does not let a generic alias steal a line belonging to a longer label', () => {
    const fields = extractFields(bankDoc([['Bank Name: Synthetic State Bank', 97]]), template);

    expect(fields.bank_name?.value).toBe('Synthetic State Bank');
    expect(fields.bank_account_holder_name).toBeUndefined();
  });

  it('gives each line to at most one field', () => {
    const fields = extractFields(bankDocument(), template);
    const values = Object.values(fields).map((field) => field?.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('returns nothing for fields that are absent', () => {
    const fields = extractFields(bankDoc([['SYNTHETIC DEMO DOCUMENT — NOT VALID', 99]]), template);

    expect(fields.bank_account_number).toBeUndefined();
    expect(fields.bank_ifsc).toBeUndefined();
  });

  it('ignores a label whose value is blank', () => {
    const fields = extractFields(bankDoc([['Account Number:', 98]]), template);

    expect(fields.bank_account_number).toBeUndefined();
  });

  it('matches labels regardless of case and spacing', () => {
    const fields = extractFields(bankDoc([['  ACCOUNT   NUMBER :  304988127745 ', 94]]), template);

    expect(fields.bank_account_number?.value).toBe('304988127745');
  });

  it('accepts the abbreviated label forms banks print', () => {
    expect(
      extractFields(bankDoc([['A/c No: 304988127745', 94]]), template).bank_account_number?.value,
    ).toBe('304988127745');
  });

  it('only reads fields belonging to the document type it was given', () => {
    const fields = extractFields(
      bankDoc([['Candidate Name: Priya Rameshbhai Patel', 97]]),
      template,
    );

    expect(fields.marksheet_candidate_name).toBeUndefined();
  });
});
