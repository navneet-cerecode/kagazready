import { SCHOLARSHIP_READINESS_TEMPLATE, type Finding, type RuleId } from '@kagazready/contracts';
import { describe, expect, it } from 'vitest';
import { analyze } from './analyze.js';
import type { OcrDocument } from './extract.js';
import {
  bankDocument,
  incomeDocument,
  marksheetDocument,
  scenarioANeedsReview,
  scenarioBNoIssues,
} from './testing/ocrFixtures.js';

const NOW = new Date('2026-09-17T10:00:00Z');
const template = SCHOLARSHIP_READINESS_TEMPLATE;

const run = (documents: OcrDocument[]) => analyze({ documents, template, now: NOW });
const ruleIds = (findings: Finding[]): RuleId[] => findings.map((finding) => finding.ruleId).sort();
const find = (findings: Finding[], ruleId: RuleId) =>
  findings.find((finding) => finding.ruleId === ruleId);

describe('analyze — the demo journey', () => {
  it('scenario A: reports the name mismatch and the unclear bank field, and nothing else', () => {
    const outcome = run(scenarioANeedsReview());

    expect(outcome.overallStatus).toBe('needs_review');
    expect(ruleIds(outcome.findings)).toEqual([
      'field_unclear_low_confidence',
      'name_material_difference',
    ]);
  });

  it('scenario A: names the bank proof as the odd one out, not the two documents that agree', () => {
    const finding = find(run(scenarioANeedsReview()).findings, 'name_material_difference');

    expect(finding?.params.outlierDocumentTypes).toBe('bank_proof');
    expect(finding?.params.referenceDocumentTypes).toBe('class_xii_marksheet,income_certificate');
    expect(finding?.params.outlierName).toBe('Priya Rameshbhai Shah');
    expect(finding?.params.referenceName).toBe('Priya Rameshbhai Patel');
  });

  it('scenario A: reports the unclear field with its confidence and the threshold it missed', () => {
    const finding = find(run(scenarioANeedsReview()).findings, 'field_unclear_low_confidence');

    expect(finding?.params.fieldId).toBe('bank_account_number');
    expect(finding?.ocrConfidence).toBeCloseTo(61.3);
    expect(finding?.params.confidence).toBe('61');
    expect(finding?.params.threshold).toBe('88');
  });

  it('scenario B: replacing the bank proof reaches no issues found', () => {
    const outcome = run(scenarioBNoIssues());

    expect(outcome.findings).toEqual([]);
    expect(outcome.overallStatus).toBe('no_issues_found');
    expect(outcome.missingDocumentTypes).toEqual([]);
  });
});

describe('analyze — masking', () => {
  it('masks the account number everywhere it appears in the outcome', () => {
    const outcome = run(scenarioANeedsReview());
    const serialized = JSON.stringify(outcome);

    expect(serialized).not.toContain('304988127745');
    expect(serialized).not.toContain('3049 8812 7745');
    expect(serialized).toContain('XXXXXXXX7745');
  });

  it('masks the account number in the readings panel too', () => {
    const reading = run(scenarioBNoIssues()).readings.find(
      (entry) => entry.documentType === 'bank_proof',
    );
    const accountNumber = reading?.fields.find((f) => f.fieldId === 'bank_account_number');

    expect(accountNumber?.value).toBe('XXXXXXXX7745');
  });
});

describe('analyze — required documents', () => {
  it('reports every missing document type and returns incomplete', () => {
    const outcome = run([marksheetDocument()]);

    expect(outcome.overallStatus).toBe('incomplete');
    expect(outcome.missingDocumentTypes).toEqual(['income_certificate', 'bank_proof']);
    expect(
      outcome.findings
        .filter((f) => f.ruleId === 'required_document_missing')
        .map((f) => f.params.documentType),
    ).toEqual(['income_certificate', 'bank_proof']);
  });

  it('returns incomplete for an empty document set', () => {
    const outcome = run([]);

    expect(outcome.overallStatus).toBe('incomplete');
    expect(outcome.missingDocumentTypes).toHaveLength(3);
  });
});

describe('analyze — required fields', () => {
  it('reports a required field that is absent from the document', () => {
    const marksheet = marksheetDocument();
    const withoutRollNumber: OcrDocument = {
      documentType: 'class_xii_marksheet',
      lines: marksheet.lines.filter((l) => !l.text.startsWith('Roll Number')),
    };

    const outcome = run([withoutRollNumber, incomeDocument(), bankDocument()]);
    const finding = find(outcome.findings, 'required_field_missing');

    expect(outcome.overallStatus).toBe('incomplete');
    expect(finding?.params.fieldId).toBe('marksheet_roll_number');
    expect(finding?.status).toBe('missing');
  });

  it('does not report an optional field that is absent', () => {
    const income = incomeDocument();
    const withoutAuthority: OcrDocument = {
      documentType: 'income_certificate',
      lines: income.lines.filter((l) => !l.text.startsWith('Issuing Authority')),
    };

    const outcome = run([marksheetDocument(), withoutAuthority, bankDocument()]);

    expect(outcome.overallStatus).toBe('no_issues_found');
  });

  it('treats an income figure with no readable number as a missing field', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ annualIncome: 'not legible' }),
      bankDocument(),
    ]);

    expect(find(outcome.findings, 'required_field_missing')?.params.fieldId).toBe(
      'income_annual_income',
    );
  });
});

describe('analyze — OCR confidence', () => {
  it('reports a value read below its threshold as unclear', () => {
    const outcome = run([
      marksheetDocument({ nameConfidence: 62 }),
      incomeDocument(),
      bankDocument(),
    ]);
    const finding = find(outcome.findings, 'field_unclear_low_confidence');

    expect(finding?.params.fieldId).toBe('marksheet_candidate_name');
    expect(outcome.overallStatus).toBe('needs_review');
  });

  it('does not compare a name it could not read clearly, to avoid inventing a second problem', () => {
    // The marksheet name is unreadable AND differs from the others. Only the unclear finding
    // should appear — claiming a mismatch on characters nobody could read would be dishonest.
    const outcome = run([
      marksheetDocument({ candidateName: 'Priya Rameshbhai Shah', nameConfidence: 55 }),
      incomeDocument(),
      bankDocument(),
    ]);

    expect(ruleIds(outcome.findings)).toEqual(['field_unclear_low_confidence']);
  });

  it('accepts a value exactly at its threshold', () => {
    const outcome = run([
      marksheetDocument({ nameConfidence: 80 }),
      incomeDocument(),
      bankDocument(),
    ]);

    expect(outcome.overallStatus).toBe('no_issues_found');
  });
});

describe('analyze — bank fields', () => {
  it('reports an IFSC that does not follow the published structure', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument(),
      bankDocument({ ifsc: 'SYNB1001234' }),
    ]);

    expect(find(outcome.findings, 'bank_ifsc_invalid_format')?.params.value).toBe('SYNB1001234');
    expect(outcome.overallStatus).toBe('needs_review');
  });

  it('reports a truncated account number, with the masked value as evidence', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument(),
      bankDocument({ accountNumber: '30498' }),
    ]);
    const finding = find(outcome.findings, 'bank_account_number_implausible');

    expect(finding?.params.digitCount).toBe('5');
    expect(finding?.params.value).toBe('X0498');
  });

  it('treats an account number line with no digits as a missing field', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument(),
      bankDocument({ accountNumber: 'not legible' }),
    ]);

    expect(find(outcome.findings, 'required_field_missing')?.params.fieldId).toBe(
      'bank_account_number',
    );
    expect(outcome.overallStatus).toBe('incomplete');
  });
});

describe('analyze — dates', () => {
  it('reports an ambiguous date with both readings', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ issueDate: '03/04/2026' }),
      bankDocument(),
    ]);
    const finding = find(outcome.findings, 'date_ambiguous');

    expect(finding?.params.dayFirst).toBe('2026-04-03');
    expect(finding?.params.monthFirst).toBe('2026-03-04');
  });

  it('reports a date that has not happened yet', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ issueDate: '21/06/2027' }),
      bankDocument(),
    ]);

    expect(find(outcome.findings, 'date_in_future')?.params.iso).toBe('2027-06-21');
  });

  it('reports a date it could not read at all', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ issueDate: '31/02/2026' }),
      bankDocument(),
    ]);

    expect(find(outcome.findings, 'date_unparseable')?.params.value).toBe('31/02/2026');
  });
});

describe('analyze — name differences across documents', () => {
  it('reports a minor difference as minor', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ applicantName: 'Priya R Patel' }),
      bankDocument(),
    ]);

    expect(find(outcome.findings, 'name_minor_difference')?.params.outlierDocumentTypes).toBe(
      'income_certificate',
    );
  });

  it('raises one finding per disagreeing group, not one per pair of documents', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ applicantName: 'Neha Suresh Mehta' }),
      bankDocument({ accountHolderName: 'Priya Rameshbhai Shah' }),
    ]);
    const nameFindings = outcome.findings.filter((f) => f.ruleId.startsWith('name_'));

    expect(nameFindings).toHaveLength(2);
    expect(nameFindings.map((f) => f.params.outlierDocumentTypes).sort()).toEqual([
      'bank_proof',
      'income_certificate',
    ]);
  });

  it('prefers the marksheet as the reference when the groups are the same size', () => {
    const outcome = run([
      marksheetDocument(),
      incomeDocument({ applicantName: 'Neha Suresh Mehta' }),
    ]);
    const finding = outcome.findings.find((f) => f.ruleId.startsWith('name_'));

    expect(finding?.params.referenceDocumentTypes).toBe('class_xii_marksheet');
    expect(finding?.params.outlierDocumentTypes).toBe('income_certificate');
  });

  it('carries evidence from both sides of the comparison', () => {
    const finding = find(run(scenarioANeedsReview()).findings, 'name_material_difference');

    expect(finding?.evidence.map((e) => e.documentType).sort()).toEqual([
      'bank_proof',
      'class_xii_marksheet',
      'income_certificate',
    ]);
  });
});

describe('analyze — contract guarantees', () => {
  it('marks every finding as deterministic in origin', () => {
    const outcome = run(scenarioANeedsReview());

    expect(outcome.findings.every((f) => f.origin === 'deterministic')).toBe(true);
  });

  it('gives every finding a stable, unique id', () => {
    const findings = run(scenarioANeedsReview()).findings;
    const ids = findings.map((f) => f.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(run(scenarioANeedsReview()).findings.map((f) => f.id)).toEqual(ids);
  });

  it('is pure: the same input produces the same output', () => {
    expect(run(scenarioANeedsReview())).toEqual(run(scenarioANeedsReview()));
  });

  it('prefers incomplete over needs review when both kinds of finding exist', () => {
    const marksheet = marksheetDocument();
    const withoutRollNumber: OcrDocument = {
      documentType: 'class_xii_marksheet',
      lines: marksheet.lines.filter((l) => !l.text.startsWith('Roll Number')),
    };

    const outcome = run([
      withoutRollNumber,
      incomeDocument(),
      bankDocument({ accountHolderName: 'Priya Rameshbhai Shah' }),
    ]);

    expect(outcome.findings.some((f) => f.status === 'needs_review')).toBe(true);
    expect(outcome.overallStatus).toBe('incomplete');
  });
});
