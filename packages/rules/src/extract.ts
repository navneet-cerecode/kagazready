import {
  expectedFieldsFor,
  type DocumentType,
  type ExpectedField,
  type FieldId,
  type Template,
} from '@kagazready/contracts';
import { normalizeText, normalizeWhitespace } from './normalize.js';

/**
 * Turns Textract `DetectDocumentText` output into labelled field values.
 *
 * Textract returns lines of text with a confidence for each. This module finds, for every field the
 * template expects, the line that carries its label and reads the value from it. It is pure: the
 * caller does the Textract call and hands the lines in.
 */

export interface OcrLine {
  text: string;
  /** Textract line confidence, 0-100. */
  confidence: number;
}

export interface OcrDocument {
  documentType: DocumentType;
  lines: OcrLine[];
}

export interface ExtractedField {
  fieldId: FieldId;
  /** Raw value as read, before masking. Never leaves the engine unmasked. */
  value: string;
  /** Confidence of the line the value itself came from. */
  confidence: number;
}

export type ExtractedFields = Partial<Record<FieldId, ExtractedField>>;

/** How strongly a line matched a label. Higher wins, so the most specific label claims the line. */
const MatchScore = {
  /** `Candidate Name: Priya` — the label before the colon is exactly the alias. */
  LabelledExact: 3,
  /** A line that is only the label, with the value on the line below. */
  LabelOnly: 2,
  /** `Roll No 1234567` — no colon, value follows the label on the same line. */
  Prefixed: 1,
} as const;
type MatchScore = (typeof MatchScore)[keyof typeof MatchScore];

interface Candidate {
  fieldId: FieldId;
  lineIndex: number;
  /** Index of the line the value was read from; differs from lineIndex for label-only lines. */
  valueLineIndex: number;
  value: string;
  score: MatchScore;
  aliasLength: number;
}

function splitOnFirstColon(text: string): { label: string; value: string } | null {
  const at = text.indexOf(':');
  if (at === -1) return null;
  return { label: text.slice(0, at), value: text.slice(at + 1) };
}

function candidatesForField(field: ExpectedField, lines: OcrLine[]): Candidate[] {
  const found: Candidate[] = [];

  lines.forEach((line, lineIndex) => {
    const normalized = normalizeText(line.text);
    const split = splitOnFirstColon(line.text);
    const nextLine = lines[lineIndex + 1];

    for (const alias of field.labels) {
      if (split) {
        if (normalizeText(split.label) === alias) {
          const inlineValue = normalizeWhitespace(split.value);
          if (inlineValue !== '') {
            found.push({
              fieldId: field.fieldId,
              lineIndex,
              valueLineIndex: lineIndex,
              value: inlineValue,
              score: MatchScore.LabelledExact,
              aliasLength: alias.length,
            });
          } else if (nextLine) {
            found.push({
              fieldId: field.fieldId,
              lineIndex,
              valueLineIndex: lineIndex + 1,
              value: normalizeWhitespace(nextLine.text),
              score: MatchScore.LabelledExact,
              aliasLength: alias.length,
            });
          }
          continue;
        }
      }

      if (normalized === alias && nextLine) {
        found.push({
          fieldId: field.fieldId,
          lineIndex,
          valueLineIndex: lineIndex + 1,
          value: normalizeWhitespace(nextLine.text),
          score: MatchScore.LabelOnly,
          aliasLength: alias.length,
        });
        continue;
      }

      if (!split && normalized.startsWith(`${alias} `)) {
        found.push({
          fieldId: field.fieldId,
          lineIndex,
          valueLineIndex: lineIndex,
          value: normalizeWhitespace(line.text.slice(alias.length)),
          score: MatchScore.Prefixed,
          aliasLength: alias.length,
        });
      }
    }
  });

  return found;
}

/**
 * Read every expected field out of one document.
 *
 * Candidates from all fields are resolved together, most specific label first, so that a generic
 * alias such as "name" cannot steal the line belonging to "bank name". Each line is consumed by at
 * most one field, and each field takes at most one line.
 */
export function extractFields(document: OcrDocument, template: Template): ExtractedFields {
  const fields = expectedFieldsFor(template, document.documentType);
  const candidates = fields
    .flatMap((field) => candidatesForField(field, document.lines))
    .sort((a, b) => b.score - a.score || b.aliasLength - a.aliasLength);

  const result: ExtractedFields = {};
  const claimedLines = new Set<number>();

  for (const candidate of candidates) {
    if (result[candidate.fieldId] !== undefined) continue;
    if (claimedLines.has(candidate.lineIndex) || claimedLines.has(candidate.valueLineIndex)) {
      continue;
    }
    if (candidate.value === '') continue;

    result[candidate.fieldId] = {
      fieldId: candidate.fieldId,
      value: candidate.value,
      confidence: document.lines[candidate.valueLineIndex]?.confidence ?? 0,
    };
    claimedLines.add(candidate.lineIndex);
    claimedLines.add(candidate.valueLineIndex);
  }

  return result;
}
