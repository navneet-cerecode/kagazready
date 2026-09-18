import type { RuleId } from '@kagazready/contracts';
import type { LanguageCopy } from './types.js';

export const EN: LanguageCopy = {
  listSeparator: ', ',
  listConjunction: ' and ',

  documentTypes: {
    class_xii_marksheet: 'Class XII marksheet',
    income_certificate: 'Income certificate',
    bank_proof: 'Bank proof',
  },

  fields: {
    marksheet_candidate_name: 'candidate name',
    marksheet_board: 'board name',
    marksheet_exam_year: 'year of examination',
    marksheet_roll_number: 'roll number',
    income_applicant_name: 'applicant name',
    income_annual_income: 'annual income',
    income_issue_date: 'date of issue',
    income_issuing_authority: 'issuing authority',
    bank_account_holder_name: 'account holder name',
    bank_account_number: 'account number',
    bank_ifsc: 'IFSC code',
    bank_name: 'bank name',
  },

  statuses: {
    incomplete: {
      label: 'Incomplete',
      summary: 'Something required is missing, so this set is not ready to submit yet.',
    },
    needs_review: {
      label: 'Needs review',
      summary: 'Everything required is here, but some details need your attention first.',
    },
    no_issues_found: {
      label: 'No issues found',
      summary:
        'These checks found nothing to fix. Requirements differ between scholarships, so read your own scholarship notice before you submit.',
    },
  },

  rules: {
    required_document_missing: {
      title: 'Not uploaded: {documentType}',
      reason: 'This readiness check expects a {documentType}, and no file was uploaded for it.',
      suggestedAction: 'Upload a clear photo or scan of your {documentType}, then check again.',
    },

    required_field_missing: {
      title: 'Missing: {fieldId}',
      reason:
        'The {fieldId} could not be found anywhere in the text read from your {documentType}.',
      suggestedAction:
        'Check that the {fieldId} is inside the photo and not cut off at an edge, then upload the {documentType} again.',
    },

    field_unclear_low_confidence: {
      title: 'Hard to read: {fieldId}',
      reason:
        'Amazon Textract read the {fieldId} on your {documentType} with {confidence}% confidence, below the {threshold}% this check needs. A person reviewing your application may struggle with it too.',
      suggestedAction:
        'Photograph the {documentType} again in even light, with the page flat and the whole field in focus, then upload it.',
    },

    name_minor_difference: {
      title: 'Small difference in the name between documents',
      reason:
        'The name on your {outlierDocumentTypes} reads "{outlierName}", while on your {referenceDocumentTypes} it is "{referenceName}". The difference is small — an initial or a spelling variant.',
      suggestedAction:
        'Decide which spelling your application will use, and make sure the documents you submit use it too. If a document is genuinely wrong, ask the office that issued it to correct it.',
    },

    name_material_difference: {
      title: 'The name does not match between documents',
      reason:
        'The name on your {outlierDocumentTypes} reads "{outlierName}", while on your {referenceDocumentTypes} it is "{referenceName}". A portal check is likely to read these as two different people.',
      suggestedAction:
        'Submit a {outlierDocumentTypes} whose name matches your other documents, or ask the office that issued it to correct the name before you apply.',
    },

    bank_ifsc_invalid_format: {
      title: 'The IFSC code is not in the expected shape',
      reason:
        '"{value}" does not follow the IFSC structure of four letters, then the digit 0, then six letters or digits.',
      suggestedAction:
        'Check the IFSC printed on your passbook and upload a clearer photo. This check looks at the shape of the code only — it cannot confirm that the branch exists.',
    },

    bank_account_number_implausible: {
      title: 'The account number looks incomplete',
      reason:
        '{digitCount} digits were read ({value}). Indian bank account numbers usually have between 9 and 18 digits, so part of it may be cut off or unreadable.',
      suggestedAction: 'Upload a photo in which the whole account number is visible and in focus.',
    },

    date_ambiguous: {
      title: 'The date could be read two ways',
      reason:
        '"{value}" on your {documentType} could mean {dayFirst} or {monthFirst}. This check does not guess between them.',
      suggestedAction:
        'Read the date on the document yourself and confirm which one it is. A certificate that writes the month in words avoids this problem entirely.',
    },

    date_in_future: {
      title: 'The date is in the future',
      reason:
        'The {fieldId} on your {documentType} was read as {iso}, a date that has not arrived yet. This is usually a typing error on the document or a misread digit.',
      suggestedAction:
        'Check the date printed on the {documentType}. If the photo was misread, upload a clearer one; if the document itself is wrong, ask the issuing office to correct it.',
    },

    date_unparseable: {
      title: 'The date could not be read',
      reason: '"{value}" on your {documentType} is not in a date format this check recognises.',
      suggestedAction:
        'Upload a photo in which the date is fully visible and in focus, then check again.',
    },
  },
};

/**
 * Reviewed English explanations used when Bedrock is unavailable or returns output that fails
 * schema validation.
 *
 * These are the safety net for the plain-language paragraph, so they are written to stand on their
 * own. They are English only, by design: when the user asked for Hindi or Gujarati and Bedrock
 * could not deliver it, the interface says the simplified explanation is unavailable in that
 * language rather than pretending it translated something.
 */
export const FALLBACK_EXPLANATIONS_EN: Record<RuleId, string> = {
  required_document_missing:
    'One of the three documents this check needs has not been uploaded, so the review is not complete yet.',
  required_field_missing:
    'A detail this check looks for is not present in the text read from the document. Either it is not on the page, or it fell outside the photo.',
  field_unclear_low_confidence:
    'The text was found, but it was blurry enough that the reading cannot be trusted. A clearer photo usually fixes this.',
  name_minor_difference:
    'The name is written slightly differently on two documents. It is probably the same person, but it is worth making the documents agree before you submit them.',
  name_material_difference:
    'Two documents carry names that are not the same name. This is the kind of difference that causes an application to be sent back, so it is worth fixing first.',
  bank_ifsc_invalid_format:
    'The IFSC code does not have the shape an IFSC code should have, which usually means a character was misread or mistyped.',
  bank_account_number_implausible:
    'The account number that was read is shorter or longer than bank account numbers normally are, so some of it is probably missing from the photo.',
  date_ambiguous:
    'The date is written in a form that can be read as two different dates. Confirming which one it is avoids a misunderstanding later.',
  date_in_future:
    'The date read from this document has not happened yet, which points to a misread or mistyped date.',
  date_unparseable:
    'The date could not be recognised as a date at all, so it could not be checked.',
};
