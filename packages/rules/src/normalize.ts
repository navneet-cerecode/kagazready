/**
 * Unicode-aware normalization used by every comparison in the rule engine.
 *
 * Pure. No I/O, no AWS, no dependencies. Devanagari and Gujarati text passes through unchanged
 * apart from case, whitespace, and conservative punctuation handling.
 */

/**
 * Title prefixes stripped before comparing person names. Only unambiguous honorifics — nothing that
 * could be part of a real given name.
 */
const TITLE_PREFIXES = new Set([
  'mr',
  'mrs',
  'ms',
  'miss',
  'master',
  'dr',
  'shri',
  'sri',
  'shree',
  'smt',
  'kum',
  'kumari',
  'श्री',
  'श्रीमती',
  'सुश्री',
  'कुमारी',
  'डॉ',
  'શ્રી',
  'શ્રીમતી',
  'કુમારી',
  'ડૉ',
]);

/**
 * Punctuation removed or turned into a separator before comparison. Conservative on purpose: a
 * hyphen or period between name parts is a formatting choice, not a difference in the name.
 */
const PUNCTUATION_TO_SPACE = /[-–—_/\\]+/gu;
const PUNCTUATION_TO_REMOVE = /['’`."“”,;:()[\]{}]+/gu;

/**
 * Any run of whitespace, including the non-breaking space, the zero-width space, and the byte
 * order mark, all of which turn up in OCR output.
 *
 * Zero-width non-joiner (U+200C) and zero-width joiner (U+200D) are deliberately NOT treated as
 * whitespace. In Devanagari and Gujarati they control whether adjacent consonants form a conjunct,
 * so they are part of how a name is spelled. Deleting them would silently rewrite the name.
 */
const WHITESPACE = /[\s\u00a0\u200b\ufeff]+/gu;

/** Collapse whitespace and trim, without touching case or script. */
export function normalizeWhitespace(value: string): string {
  return value.replace(WHITESPACE, ' ').trim();
}

/**
 * Canonical form for comparing any text value: NFC so that composed and decomposed forms of the
 * same character compare equal, then whitespace-collapsed, then lowercased.
 */
export function normalizeText(value: string): string {
  return normalizeWhitespace(value.normalize('NFC')).toLowerCase();
}

/**
 * Canonical form for comparing a person's name. Applies {@link normalizeText}, turns separator
 * punctuation into spaces, drops decorative punctuation, and removes leading honorifics.
 */
export function normalizePersonName(value: string): string {
  const cleaned = normalizeText(value)
    .replace(PUNCTUATION_TO_SPACE, ' ')
    .replace(PUNCTUATION_TO_REMOVE, '');
  const tokens = normalizeWhitespace(cleaned).split(' ').filter(Boolean);
  while (tokens.length > 1 && TITLE_PREFIXES.has(tokens[0]!)) {
    tokens.shift();
  }
  return tokens.join(' ');
}

/** Name tokens after normalization. Empty array for an empty or honorific-only name. */
export function nameTokens(value: string): string[] {
  const normalized = normalizePersonName(value);
  return normalized === '' ? [] : normalized.split(' ');
}

/** Digits only, for account numbers and other numeric identifiers. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/gu, '');
}

/** Upper-case, whitespace- and punctuation-free form used for codes such as IFSC. */
export function normalizeCode(value: string): string {
  return value
    .normalize('NFC')
    .replace(WHITESPACE, '')
    .replace(PUNCTUATION_TO_REMOVE, '')
    .replace(PUNCTUATION_TO_SPACE, '')
    .toUpperCase();
}

/**
 * Levenshtein distance, capped: returns `limit + 1` as soon as the distance is known to exceed
 * `limit`, so a long pair of unrelated strings costs almost nothing.
 */
export function boundedEditDistance(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  const source = Array.from(a);
  const target = Array.from(b);
  let previous = Array.from({ length: target.length + 1 }, (_, i) => i);

  for (let i = 1; i <= source.length; i += 1) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= target.length; j += 1) {
      const substitution = previous[j - 1]! + (source[i - 1] === target[j - 1] ? 0 : 1);
      const insertion = current[j - 1]! + 1;
      const deletion = previous[j]! + 1;
      const value = Math.min(substitution, insertion, deletion);
      current.push(value);
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > limit) return limit + 1;
    previous = current;
  }

  return previous[target.length]!;
}
