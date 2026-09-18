import type { OcrDocument, OcrLine } from '../extract.js';

/**
 * Synthetic OCR fixtures.
 *
 * These are the *text* fixtures used by unit tests, so rule behaviour can be asserted without
 * calling AWS. The image fixtures in `fixtures/` are separate, are rendered to real PNGs, and go
 * through real Textract — the demo journey never uses the data below.
 *
 * Every identity and number here is invented.
 */

export const SYNTHETIC_STAMP = 'SYNTHETIC DEMO DOCUMENT — NOT VALID';

const line = (text: string, confidence: number): OcrLine => ({ text, confidence });

export interface MarksheetOptions {
  candidateName?: string;
  rollNumber?: string;
  examYear?: string;
  nameConfidence?: number;
}

export function marksheetDocument(options: MarksheetOptions = {}): OcrDocument {
  const {
    candidateName = 'Priya Rameshbhai Patel',
    rollNumber = 'GJ2024881234',
    examYear = '2024',
    nameConfidence = 97.4,
  } = options;

  return {
    documentType: 'class_xii_marksheet',
    lines: [
      line(SYNTHETIC_STAMP, 99.1),
      line('Board: Synthetic State Board of Secondary Education', 98.2),
      line(`Candidate Name: ${candidateName}`, nameConfidence),
      line(`Roll Number: ${rollNumber}`, 96.8),
      line(`Year of Examination: ${examYear}`, 98.0),
    ],
  };
}

export interface IncomeOptions {
  applicantName?: string;
  annualIncome?: string;
  issueDate?: string;
  nameConfidence?: number;
  dateConfidence?: number;
}

export function incomeDocument(options: IncomeOptions = {}): OcrDocument {
  const {
    applicantName = 'Priya Rameshbhai Patel',
    annualIncome = 'Rs. 1,84,000',
    issueDate = '21/06/2026',
    nameConfidence = 97.0,
    dateConfidence = 96.5,
  } = options;

  return {
    documentType: 'income_certificate',
    lines: [
      line(SYNTHETIC_STAMP, 99.0),
      line(`Applicant Name: ${applicantName}`, nameConfidence),
      line(`Annual Income: ${annualIncome}`, 96.2),
      line(`Date of Issue: ${issueDate}`, dateConfidence),
      line('Issuing Authority: Synthetic Taluka Office', 95.4),
    ],
  };
}

export interface BankOptions {
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  nameConfidence?: number;
  accountNumberConfidence?: number;
}

export function bankDocument(options: BankOptions = {}): OcrDocument {
  const {
    accountHolderName = 'Priya Rameshbhai Patel',
    accountNumber = '3049 8812 7745',
    ifsc = 'SYNB0234567',
    nameConfidence = 96.4,
    accountNumberConfidence = 94.1,
  } = options;

  return {
    documentType: 'bank_proof',
    lines: [
      line(SYNTHETIC_STAMP, 99.2),
      line('Bank Name: Synthetic State Bank', 97.1),
      line(`Account Holder: ${accountHolderName}`, nameConfidence),
      line(`Account Number: ${accountNumber}`, accountNumberConfidence),
      line(`IFSC: ${ifsc}`, 95.9),
    ],
  };
}

/**
 * Scenario A — the document set the demo starts from.
 *
 * Two independent problems, both in the bank proof: the account holder name is a different surname
 * from the other two documents, and the account number line is degraded enough that Textract
 * reports low confidence. Expected outcome: needs_review.
 */
export function scenarioANeedsReview(): OcrDocument[] {
  return [
    marksheetDocument(),
    incomeDocument(),
    bankDocument({
      accountHolderName: 'Priya Rameshbhai Shah',
      accountNumberConfidence: 61.3,
    }),
  ];
}

/**
 * Scenario B — the same set after the bank proof is replaced with a clear, consistent one.
 * Expected outcome: no_issues_found.
 */
export function scenarioBNoIssues(): OcrDocument[] {
  return [marksheetDocument(), incomeDocument(), bankDocument()];
}
