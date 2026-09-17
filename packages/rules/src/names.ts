import { boundedEditDistance, nameTokens, normalizePersonName } from './normalize.js';

/**
 * Cross-document person-name comparison.
 *
 * Three outcomes, chosen so the product never overstates what it knows:
 * - `match`      the two names are the same name written slightly differently
 * - `minor`      a difference a human should look at, commonly an initial or a spelling variant
 * - `material`   a different name, which a portal is likely to treat as a mismatch
 */
export type NameRelation = 'match' | 'minor' | 'material';

export interface NameComparison {
  relation: NameRelation;
  /** Normalized forms actually compared, useful for evidence and for tests. */
  normalizedLeft: string;
  normalizedRight: string;
}

/** Remove the tokens the two lists have in common, respecting duplicates. */
function multisetDifference(left: string[], right: string[]): [string[], string[]] {
  const remainingRight = [...right];
  const leftOnly: string[] = [];
  for (const token of left) {
    const at = remainingRight.indexOf(token);
    if (at === -1) leftOnly.push(token);
    else remainingRight.splice(at, 1);
  }
  return [leftOnly, remainingRight];
}

const isInitial = (token: string): boolean => Array.from(token).length === 1;

/** True when `initial` is the first character of `full`, e.g. "r" for "ramesh". */
function initialOf(initial: string, full: string): boolean {
  return isInitial(initial) && !isInitial(full) && Array.from(full)[0] === initial;
}

/**
 * Minimum token length at which a one-character edit is treated as a spelling variant rather than a
 * different name. "ram" vs "raj" is a different name; "patel" vs "pately" is a spelling variant.
 */
const SPELLING_VARIANT_MIN_LENGTH = 4;

export function compareNames(left: string, right: string): NameComparison {
  const normalizedLeft = normalizePersonName(left);
  const normalizedRight = normalizePersonName(right);
  const result = (relation: NameRelation): NameComparison => ({
    relation,
    normalizedLeft,
    normalizedRight,
  });

  if (normalizedLeft === normalizedRight) return result('match');

  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  const [leftOnly, rightOnly] = multisetDifference(leftTokens, rightTokens);

  // Same tokens in a different order: the same name, written differently.
  if (leftOnly.length === 0 && rightOnly.length === 0) return result('match');

  // One side carries extra single-letter initials the other omits, e.g. "Priya R Patel" vs
  // "Priya Patel". Worth a look, not a correction.
  const extrasAreAllInitials = (extras: string[], others: string[]): boolean =>
    extras.length > 0 && others.length === 0 && extras.every(isInitial);
  if (extrasAreAllInitials(leftOnly, rightOnly) || extrasAreAllInitials(rightOnly, leftOnly)) {
    return result('minor');
  }

  // Exactly one token differs on each side.
  if (leftOnly.length === 1 && rightOnly.length === 1) {
    const a = leftOnly[0]!;
    const b = rightOnly[0]!;
    if (initialOf(a, b) || initialOf(b, a)) return result('minor');
    const longest = Math.max(Array.from(a).length, Array.from(b).length);
    if (longest >= SPELLING_VARIANT_MIN_LENGTH && boundedEditDistance(a, b, 1) <= 1) {
      return result('minor');
    }
    return result('material');
  }

  // A whole extra or missing name part, or several tokens differing: treat as a different name.
  return result('material');
}
