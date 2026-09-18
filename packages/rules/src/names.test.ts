import { describe, expect, it } from 'vitest';
import { compareNames } from './names.js';

const relation = (a: string, b: string) => compareNames(a, b).relation;

describe('compareNames — match', () => {
  it('treats identical names as a match', () => {
    expect(relation('Priya Rameshbhai Patel', 'Priya Rameshbhai Patel')).toBe('match');
  });

  it('ignores case, spacing and punctuation differences', () => {
    expect(relation('PRIYA  RAMESHBHAI   PATEL', 'priya rameshbhai patel')).toBe('match');
    expect(relation('Priya Ramesh-Patel', 'Priya Ramesh Patel')).toBe('match');
  });

  it('ignores honorifics', () => {
    expect(relation('Kum. Priya Patel', 'Priya Patel')).toBe('match');
  });

  it('accepts reordered tokens as the same name', () => {
    expect(relation('Patel Priya Rameshbhai', 'Priya Rameshbhai Patel')).toBe('match');
  });

  it('compares Devanagari and Gujarati names', () => {
    expect(relation('प्रिया रमेशभाई पटेल', 'प्रिया रमेशभाई पटेल')).toBe('match');
    expect(relation('પ્રિયા પટેલ', 'પટેલ પ્રિયા')).toBe('match');
  });
});

describe('compareNames — minor difference', () => {
  it('flags an initial standing in for a full middle name', () => {
    expect(relation('Priya Rameshbhai Patel', 'Priya R Patel')).toBe('minor');
  });

  it('flags an extra middle initial that the other document omits', () => {
    expect(relation('Priya R Patel', 'Priya Patel')).toBe('minor');
  });

  it('treats a middle name one document leaves out as minor when first and last agree', () => {
    expect(relation('Priya Rameshbhai Patel', 'Priya Patel')).toBe('minor');
    expect(relation('Priya Patel', 'Priya Rameshbhai Patel')).toBe('minor');
    expect(relation('प्रिया रमेशभाई पटेल', 'प्रिया पटेल')).toBe('minor');
    expect(relation('Aarav Kumar Singh', 'Aarav Singh')).toBe('minor');
  });

  it('flags a one-character spelling variant in a long token', () => {
    expect(relation('Priya Patel', 'Priya Pately')).toBe('minor');
    expect(relation('Priya Patel', 'Priya Patal')).toBe('minor');
  });
});

describe('compareNames — material difference', () => {
  it('flags a different surname', () => {
    expect(relation('Priya Rameshbhai Patel', 'Priya Rameshbhai Shah')).toBe('material');
  });

  it('flags a whole extra name part at the end or the start', () => {
    expect(relation('Aarav Kumar', 'Aarav Kumar Singh')).toBe('material');
    expect(relation('Kumar Singh', 'Aarav Kumar Singh')).toBe('material');
    expect(relation('Aarav', 'Aarav Singh')).toBe('material');
  });

  it('does not excuse a one-character difference in a short token', () => {
    expect(relation('Ram Patel', 'Raj Patel')).toBe('material');
  });

  it('flags two or more differing tokens', () => {
    expect(relation('Priya Rameshbhai Patel', 'Neha Suresh Patel')).toBe('material');
  });

  it('flags a completely different name', () => {
    expect(relation('Priya Patel', 'Aarav Kumar')).toBe('material');
  });
});

describe('compareNames — reported forms', () => {
  it('returns the normalized forms it actually compared', () => {
    const comparison = compareNames('Smt. Priya  Patel', 'priya patel');
    expect(comparison.normalizedLeft).toBe('priya patel');
    expect(comparison.normalizedRight).toBe('priya patel');
  });
});
