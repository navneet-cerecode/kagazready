import { describe, expect, it } from 'vitest';
import { maskAccountNumber, maskFieldValue, redactDigitRuns } from './mask.js';

describe('maskAccountNumber', () => {
  it('keeps only the last four digits', () => {
    expect(maskAccountNumber('304988127745')).toBe('XXXXXXXX7745');
  });

  it('ignores spacing and punctuation when counting digits', () => {
    expect(maskAccountNumber('3049 8812 7745')).toBe('XXXXXXXX7745');
    expect(maskAccountNumber('3049-8812-7745')).toBe('XXXXXXXX7745');
  });

  it('masks a short number completely, because four of five digits is not a mask', () => {
    expect(maskAccountNumber('12345')).toBe('X2345');
    expect(maskAccountNumber('1234')).toBe('XXXX');
    expect(maskAccountNumber('99')).toBe('XX');
  });

  it('returns an empty string when there are no digits at all', () => {
    expect(maskAccountNumber('not legible')).toBe('');
  });

  it('never returns any digit that is not one of the last four', () => {
    const raw = '987654321098';
    const masked = maskAccountNumber(raw);
    expect(masked).not.toContain('9876');
    expect(masked.replace(/X/gu, '')).toBe('1098');
  });
});

describe('maskFieldValue', () => {
  it('masks account numbers', () => {
    expect(maskFieldValue({ kind: 'account_number' }, '3049 8812 7745')).toBe('XXXXXXXX7745');
  });

  it('shows the other field kinds as read, because the user needs to see the mistake', () => {
    expect(maskFieldValue({ kind: 'person_name' }, ' Priya  Patel ')).toBe('Priya Patel');
    expect(maskFieldValue({ kind: 'ifsc' }, 'SYNB0001234')).toBe('SYNB0001234');
    expect(maskFieldValue({ kind: 'date' }, '21/06/2026')).toBe('21/06/2026');
    expect(maskFieldValue({ kind: 'amount' }, 'Rs. 1,84,000')).toBe('Rs. 1,84,000');
    expect(maskFieldValue({ kind: 'text' }, 'Synthetic State Bank')).toBe('Synthetic State Bank');
  });
});

describe('redactDigitRuns', () => {
  it('redacts long digit runs so a stray log line cannot leak an account number', () => {
    expect(redactDigitRuns('Account Number: 304988127745')).toBe('Account Number: XXXXXXXXXXXX');
    expect(redactDigitRuns('Account Number: 3049 8812 7745')).toBe(
      'Account Number: XXXXXXXXXXXXXX',
    );
  });

  it('leaves short numbers such as years alone', () => {
    expect(redactDigitRuns('Year of Examination: 2024')).toBe('Year of Examination: 2024');
  });
});
