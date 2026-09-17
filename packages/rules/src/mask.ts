import type { ExpectedField } from '@kagazready/contracts';
import { digitsOnly, normalizeWhitespace } from './normalize.js';

/**
 * Masking applied before a value leaves the rule engine.
 *
 * Every path out of the engine — API response, log line, Bedrock prompt — receives masked values.
 * The unmasked value exists only inside the engine, only long enough to run a check on it.
 */

const VISIBLE_TRAILING_DIGITS = 4;

/**
 * Mask a bank account number, keeping the last four digits so a user can recognise their own
 * account. A number with four or fewer digits is masked completely, because showing "the last
 * four" of a five-digit number reveals almost all of it.
 */
export function maskAccountNumber(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length === 0) return '';
  if (digits.length <= VISIBLE_TRAILING_DIGITS) return 'X'.repeat(digits.length);
  const hidden = 'X'.repeat(digits.length - VISIBLE_TRAILING_DIGITS);
  return hidden + digits.slice(-VISIBLE_TRAILING_DIGITS);
}

/**
 * Mask a value according to what kind of field it is.
 *
 * Names, dates, amounts, codes, and free text are shown as read — they are what the user needs to
 * see to spot the mistake, and they are already on the document in front of them. Account numbers
 * are the one value that is masked.
 */
export function maskFieldValue(field: Pick<ExpectedField, 'kind'>, value: string): string {
  if (field.kind === 'account_number') return maskAccountNumber(value);
  return normalizeWhitespace(value);
}

/**
 * Redact anything that looks like a long digit run, for log lines. Defence in depth: even if a raw
 * OCR line reaches a logger by mistake, the account number in it does not.
 */
export function redactDigitRuns(text: string): string {
  return text.replace(/\d[\d\s-]{7,}\d/gu, (match) => 'X'.repeat(match.length));
}
