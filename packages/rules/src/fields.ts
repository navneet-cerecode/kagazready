import { digitsOnly, normalizeCode, normalizeWhitespace } from './normalize.js';

/**
 * Field-level validation: bank codes, Indian-style dates, and amounts.
 *
 * Note on amounts: KagazReady reads the income figure so it can tell the user whether it is legible
 * and present. It never compares it against a limit. Deciding whether an income qualifies for a
 * scholarship is an eligibility judgement, and this product does not make eligibility judgements.
 */

/**
 * IFSC structure as published by the Reserve Bank of India: four letters for the bank, then the
 * digit 0 reserved for future use, then six alphanumerics for the branch.
 *
 * This is a structural check only. It cannot tell whether the branch exists.
 */
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/u;

export function isIfscStructurallyValid(raw: string): boolean {
  return IFSC_PATTERN.test(normalizeCode(raw));
}

/** Plausible length range for an Indian bank account number. */
const ACCOUNT_MIN_DIGITS = 9;
const ACCOUNT_MAX_DIGITS = 18;

export function isAccountNumberPlausible(raw: string): boolean {
  const length = digitsOnly(raw).length;
  return length >= ACCOUNT_MIN_DIGITS && length <= ACCOUNT_MAX_DIGITS;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export type ParsedDate =
  | { kind: 'parsed'; iso: string }
  /** Valid read either way round, e.g. 03/04/2026. The user must confirm which they meant. */
  | { kind: 'ambiguous'; dayFirstIso: string; monthFirstIso: string }
  | { kind: 'unparseable' };

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const NUMERIC_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/u;
const ISO_DATE = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/u;
const NAMED_MONTH_DATE = /^(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})$/u;

/** Real-calendar check, so 31/02/2026 does not silently become 03/03/2026. */
function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a date the way it is written on Indian documents: day first.
 *
 * A purely numeric date where both leading components are 12 or less is reported as ambiguous
 * rather than assumed, because assuming is how 03/04 silently becomes the wrong month.
 */
export function parseIndianDate(raw: string): ParsedDate {
  const text = normalizeWhitespace(raw)
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th)\b/gu, '$1')
    .replace(/\s*,\s*/gu, ' ');

  const iso = ISO_DATE.exec(text);
  if (iso) {
    const value = toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return value ? { kind: 'parsed', iso: value } : { kind: 'unparseable' };
  }

  const named = NAMED_MONTH_DATE.exec(text);
  if (named) {
    const month = MONTH_NAMES[named[2]!];
    if (month === undefined) return { kind: 'unparseable' };
    const value = toIso(Number(named[3]), month, Number(named[1]));
    return value ? { kind: 'parsed', iso: value } : { kind: 'unparseable' };
  }

  const numeric = NUMERIC_DATE.exec(text);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    const dayFirst = toIso(year, second, first);
    const monthFirst = toIso(year, first, second);

    if (dayFirst && monthFirst && first !== second) {
      return { kind: 'ambiguous', dayFirstIso: dayFirst, monthFirstIso: monthFirst };
    }
    // Same value both ways round (05/05), or only one reading is a real date.
    const resolved = dayFirst ?? monthFirst;
    return resolved ? { kind: 'parsed', iso: resolved } : { kind: 'unparseable' };
  }

  return { kind: 'unparseable' };
}

/** True when an ISO date is later than `now`. Compared at day resolution, in UTC. */
export function isFutureIsoDate(iso: string, now: Date): boolean {
  const today = now.toISOString().slice(0, 10);
  return iso > today;
}

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------

/**
 * Read a rupee amount written with any of the usual decorations: a currency symbol, `Rs.`, Indian
 * digit grouping, a decimal part. Returns null when there is no number to read.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = normalizeWhitespace(raw)
    .replace(/(rs\.?|inr|₹)/giu, '')
    .replace(/,/gu, '')
    .trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?/u.exec(cleaned);
  if (!match) return null;
  const value = Number(match[2] ? `${match[1]}.${match[2]}` : match[1]);
  return Number.isFinite(value) ? value : null;
}
