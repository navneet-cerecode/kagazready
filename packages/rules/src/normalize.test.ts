import { describe, expect, it } from 'vitest';
import {
  boundedEditDistance,
  digitsOnly,
  nameTokens,
  normalizeCode,
  normalizePersonName,
  normalizeText,
  normalizeWhitespace,
} from './normalize.js';

describe('normalizeWhitespace', () => {
  it('collapses runs of whitespace and trims', () => {
    expect(normalizeWhitespace('  Priya   Ramesh \n Patel  ')).toBe('Priya Ramesh Patel');
  });

  it('treats the non-breaking space, zero-width space and BOM as whitespace', () => {
    const nbsp = String.fromCharCode(0x00a0);
    const zwsp = String.fromCharCode(0x200b);
    const bom = String.fromCharCode(0xfeff);

    expect(normalizeWhitespace(`Priya${nbsp}Patel`)).toBe('Priya Patel');
    expect(normalizeWhitespace(`Priya Patel${zwsp}`)).toBe('Priya Patel');
    expect(normalizeWhitespace(`${bom}Priya Patel`)).toBe('Priya Patel');
  });

  it('preserves the zero-width non-joiner and joiner, which spell Indic names', () => {
    // In Devanagari and Gujarati these control conjunct formation, so they are part of the
    // spelling. Treating them as whitespace would quietly rewrite the name being compared.
    const zwnj = String.fromCharCode(0x200c);
    const zwj = String.fromCharCode(0x200d);
    const ka = String.fromCharCode(0x0915);
    const sha = String.fromCharCode(0x0937);

    expect(normalizeWhitespace(`${ka}${zwnj}${sha}`)).toContain(zwnj);
    expect(normalizeText(`${ka}${zwj}${sha}`)).toContain(zwj);
  });
});

describe('normalizeText', () => {
  it('lowercases and normalizes to NFC', () => {
    expect(normalizeText('  PRIYA  Patel ')).toBe('priya patel');
  });

  it('makes the two encodings of a Devanagari nukta letter compare equal', () => {
    // The letter qa exists twice in Unicode: precomposed as U+0958, and as ka (U+0915) followed
    // by the nukta sign (U+093C). OCR output can carry either form of the same name.
    const precomposed = String.fromCharCode(0x0958);
    const withNukta = String.fromCharCode(0x0915, 0x093c);

    expect(precomposed).not.toBe(withNukta);
    expect(normalizeText(precomposed)).toBe(normalizeText(withNukta));
  });

  it('makes decomposed and composed Latin accents compare equal', () => {
    // e-acute as a single character, versus e followed by a combining acute accent.
    const composed = 'Jos' + String.fromCharCode(0x00e9);
    const decomposed = 'Jos' + String.fromCharCode(0x0065, 0x0301);

    expect(composed).not.toBe(decomposed);
    expect(normalizeText(composed)).toBe(normalizeText(decomposed));
  });

  it('leaves Gujarati text intact apart from whitespace', () => {
    expect(normalizeText('  પ્રિયા   પટેલ ')).toBe('પ્રિયા પટેલ');
  });
});

describe('normalizePersonName', () => {
  it('removes separator and decorative punctuation', () => {
    expect(normalizePersonName('Priya R. Patel-Shah')).toBe('priya r patel shah');
    expect(normalizePersonName("D'Souza, Maria")).toBe('dsouza maria');
  });

  it('strips honorific prefixes in Latin, Devanagari and Gujarati', () => {
    expect(normalizePersonName('Shri Aarav Kumar')).toBe('aarav kumar');
    expect(normalizePersonName('Smt. Priya Patel')).toBe('priya patel');
    expect(normalizePersonName('श्री आरव कुमार')).toBe('आरव कुमार');
    expect(normalizePersonName('શ્રીમતી પ્રિયા પટેલ')).toBe('પ્રિયા પટેલ');
  });

  it('never strips the only token, so a one-word name survives', () => {
    expect(normalizePersonName('Kumari')).toBe('kumari');
  });

  it('returns an empty string for an empty name', () => {
    expect(normalizePersonName('   ')).toBe('');
    expect(nameTokens('  ')).toEqual([]);
  });
});

describe('digitsOnly and normalizeCode', () => {
  it('keeps only digits', () => {
    expect(digitsOnly('3049 8812-7745')).toBe('304988127745');
  });

  it('uppercases codes and removes spacing', () => {
    expect(normalizeCode(' synb0 001234 ')).toBe('SYNB0001234');
  });
});

describe('boundedEditDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(boundedEditDistance('patel', 'patel', 1)).toBe(0);
  });

  it('counts a single substitution, insertion or deletion as 1', () => {
    expect(boundedEditDistance('patel', 'patal', 1)).toBe(1);
    expect(boundedEditDistance('patel', 'pately', 1)).toBe(1);
    expect(boundedEditDistance('pately', 'patel', 1)).toBe(1);
  });

  it('stops early once the limit is exceeded', () => {
    expect(boundedEditDistance('patel', 'shah', 1)).toBe(2);
    expect(boundedEditDistance('patel', 'completely-different', 1)).toBe(2);
  });

  it('counts by code point, not UTF-16 unit', () => {
    expect(boundedEditDistance('पटेल', 'पटेल', 1)).toBe(0);
  });
});
