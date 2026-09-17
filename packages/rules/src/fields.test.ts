import { describe, expect, it } from 'vitest';
import {
  isAccountNumberPlausible,
  isFutureIsoDate,
  isIfscStructurallyValid,
  parseAmount,
  parseIndianDate,
} from './fields.js';

describe('isIfscStructurallyValid', () => {
  it('accepts a structurally valid code', () => {
    expect(isIfscStructurallyValid('SYNB0001234')).toBe(true);
    expect(isIfscStructurallyValid('synb0001234')).toBe(true);
    expect(isIfscStructurallyValid(' SYNB0 001234 ')).toBe(true);
  });

  it('rejects codes that break the published structure', () => {
    expect(isIfscStructurallyValid('SYN0001234')).toBe(false); // three bank letters
    expect(isIfscStructurallyValid('SYNB1001234')).toBe(false); // fifth character not 0
    expect(isIfscStructurallyValid('SYNB000123')).toBe(false); // branch too short
    expect(isIfscStructurallyValid('SYNB00012345')).toBe(false); // branch too long
    expect(isIfscStructurallyValid('')).toBe(false);
  });
});

describe('isAccountNumberPlausible', () => {
  it('accepts lengths banks actually issue', () => {
    expect(isAccountNumberPlausible('304988127745')).toBe(true);
    expect(isAccountNumberPlausible('3049 8812 7745')).toBe(true);
    expect(isAccountNumberPlausible('123456789')).toBe(true);
    expect(isAccountNumberPlausible('123456789012345678')).toBe(true);
  });

  it('rejects numbers that are clearly truncated or too long', () => {
    expect(isAccountNumberPlausible('30498')).toBe(false);
    expect(isAccountNumberPlausible('1234567890123456789')).toBe(false);
    expect(isAccountNumberPlausible('')).toBe(false);
  });
});

describe('parseIndianDate', () => {
  it('reads an unambiguous day-first date', () => {
    expect(parseIndianDate('21/06/2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
    expect(parseIndianDate('21-06-2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
    expect(parseIndianDate('21.06.2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
  });

  it('reads an ISO date', () => {
    expect(parseIndianDate('2026-06-21')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
  });

  it('reads a date with the month written in words', () => {
    expect(parseIndianDate('21 June 2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
    expect(parseIndianDate('21 Jun 2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
    expect(parseIndianDate('1st Sept 2026')).toEqual({ kind: 'parsed', iso: '2026-09-01' });
  });

  it('reports a date that is valid read either way as ambiguous', () => {
    expect(parseIndianDate('03/04/2026')).toEqual({
      kind: 'ambiguous',
      dayFirstIso: '2026-04-03',
      monthFirstIso: '2026-03-04',
    });
  });

  it('does not call a date ambiguous when both readings are the same day', () => {
    expect(parseIndianDate('05/05/2026')).toEqual({ kind: 'parsed', iso: '2026-05-05' });
  });

  it('falls back to the only real reading when day-first is impossible', () => {
    expect(parseIndianDate('06/21/2026')).toEqual({ kind: 'parsed', iso: '2026-06-21' });
  });

  it('rejects dates that are not real calendar days', () => {
    expect(parseIndianDate('31/02/2026')).toEqual({ kind: 'unparseable' });
    expect(parseIndianDate('32/01/2026')).toEqual({ kind: 'unparseable' });
  });

  it('treats text it cannot recognise as unparseable rather than throwing', () => {
    expect(parseIndianDate('')).toEqual({ kind: 'unparseable' });
    expect(parseIndianDate('not a date')).toEqual({ kind: 'unparseable' });
    expect(parseIndianDate('21/06/26')).toEqual({ kind: 'unparseable' });
    expect(parseIndianDate('21 Junuary 2026')).toEqual({ kind: 'unparseable' });
  });
});

describe('isFutureIsoDate', () => {
  const now = new Date('2026-09-17T10:00:00Z');

  it('detects a date later than today', () => {
    expect(isFutureIsoDate('2026-09-18', now)).toBe(true);
    expect(isFutureIsoDate('2027-01-01', now)).toBe(true);
  });

  it('treats today and the past as not future', () => {
    expect(isFutureIsoDate('2026-09-17', now)).toBe(false);
    expect(isFutureIsoDate('2026-06-21', now)).toBe(false);
  });
});

describe('parseAmount', () => {
  it('reads amounts with Indian grouping and decoration', () => {
    expect(parseAmount('Rs. 1,84,000')).toBe(184000);
    expect(parseAmount('₹1,84,000.50')).toBe(184000.5);
    expect(parseAmount('INR 184000')).toBe(184000);
    expect(parseAmount('184000')).toBe(184000);
  });

  it('returns null when there is no number to read', () => {
    expect(parseAmount('Rs. -')).toBeNull();
    expect(parseAmount('not legible')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});
