import {
  documentTypeForField,
  expectedFieldById,
  expectedFieldsFor,
  type AnalysisOutcome,
  type DocumentReading,
  type DocumentType,
  type Evidence,
  type ExpectedField,
  type FieldId,
  type Finding,
  type FindingStatus,
  type OverallStatus,
  type RuleId,
  type Template,
} from '@kagazready/contracts';
import {
  isAccountNumberPlausible,
  isFutureIsoDate,
  isIfscStructurallyValid,
  parseAmount,
  parseIndianDate,
} from './fields.js';
import { maskFieldValue } from './mask.js';
import { compareNames } from './names.js';
import { digitsOnly } from './normalize.js';
import { extractFields, type ExtractedFields, type OcrDocument } from './extract.js';

/**
 * The deterministic rule engine.
 *
 * This function, and nothing else, decides the readiness status of a document set. It is pure:
 * same input, same output, no clock of its own, no network, no AWS. Bedrock runs afterwards and can
 * only rephrase what is decided here.
 */

export interface AnalyzeInput {
  documents: OcrDocument[];
  template: Template;
  /** Injected so that "is this date in the future" is testable and reproducible. */
  now: Date;
}

interface FindingDraft {
  ruleId: RuleId;
  status: FindingStatus;
  documentTypes: DocumentType[];
  fieldId?: FieldId;
  params: Record<string, string>;
  evidence?: Evidence[];
  ocrConfidence?: number | null;
}

function toFinding(draft: FindingDraft): Finding {
  return {
    id: `${draft.ruleId}:${draft.documentTypes.join('+')}:${draft.fieldId ?? ''}`,
    ruleId: draft.ruleId,
    status: draft.status,
    documentTypes: draft.documentTypes,
    params: draft.params,
    evidence: draft.evidence ?? [],
    ocrConfidence: draft.ocrConfidence ?? null,
    origin: 'deterministic',
  };
}

function evidenceFor(
  documentType: DocumentType,
  field: ExpectedField,
  rawValue: string,
  confidence: number | null,
): Evidence {
  return {
    documentType,
    fieldId: field.fieldId,
    value: maskFieldValue(field, rawValue),
    ocrConfidence: confidence,
  };
}

/** Run the per-field checks for one document. */
function checkDocument(
  documentType: DocumentType,
  fields: ExtractedFields,
  template: Template,
  now: Date,
): FindingDraft[] {
  const drafts: FindingDraft[] = [];

  for (const field of expectedFieldsFor(template, documentType)) {
    const extracted = fields[field.fieldId];
    const base = { documentTypes: [documentType], fieldId: field.fieldId };

    if (!extracted) {
      if (field.required) {
        drafts.push({
          ...base,
          ruleId: 'required_field_missing',
          status: 'missing',
          params: { documentType, fieldId: field.fieldId },
        });
      }
      continue;
    }

    const masked = maskFieldValue(field, extracted.value);
    const evidence = [evidenceFor(documentType, field, extracted.value, extracted.confidence)];

    // An unclear read is reported as unclear. Running content checks on characters Textract is not
    // sure about would produce confident-sounding findings about text nobody has actually read.
    if (extracted.confidence < field.minOcrConfidence) {
      drafts.push({
        ...base,
        ruleId: 'field_unclear_low_confidence',
        status: 'needs_review',
        params: {
          documentType,
          fieldId: field.fieldId,
          confidence: String(Math.round(extracted.confidence)),
          threshold: String(field.minOcrConfidence),
        },
        evidence,
        ocrConfidence: extracted.confidence,
      });
      continue;
    }

    switch (field.kind) {
      case 'ifsc': {
        if (!isIfscStructurallyValid(extracted.value)) {
          drafts.push({
            ...base,
            ruleId: 'bank_ifsc_invalid_format',
            status: 'needs_review',
            params: { documentType, fieldId: field.fieldId, value: masked },
            evidence,
          });
        }
        break;
      }

      case 'account_number': {
        const digits = digitsOnly(extracted.value);
        if (digits === '') {
          drafts.push({
            ...base,
            ruleId: 'required_field_missing',
            status: 'missing',
            params: { documentType, fieldId: field.fieldId },
          });
        } else if (!isAccountNumberPlausible(extracted.value)) {
          drafts.push({
            ...base,
            ruleId: 'bank_account_number_implausible',
            status: 'needs_review',
            params: {
              documentType,
              fieldId: field.fieldId,
              value: masked,
              digitCount: String(digits.length),
            },
            evidence,
          });
        }
        break;
      }

      case 'amount': {
        if (parseAmount(extracted.value) === null) {
          drafts.push({
            ...base,
            ruleId: 'required_field_missing',
            status: 'missing',
            params: { documentType, fieldId: field.fieldId },
          });
        }
        break;
      }

      case 'date': {
        const parsed = parseIndianDate(extracted.value);
        if (parsed.kind === 'unparseable') {
          drafts.push({
            ...base,
            ruleId: 'date_unparseable',
            status: 'needs_review',
            params: { documentType, fieldId: field.fieldId, value: masked },
            evidence,
          });
        } else if (parsed.kind === 'ambiguous') {
          drafts.push({
            ...base,
            ruleId: 'date_ambiguous',
            status: 'needs_review',
            params: {
              documentType,
              fieldId: field.fieldId,
              value: masked,
              dayFirst: parsed.dayFirstIso,
              monthFirst: parsed.monthFirstIso,
            },
            evidence,
          });
        } else if (isFutureIsoDate(parsed.iso, now)) {
          drafts.push({
            ...base,
            ruleId: 'date_in_future',
            status: 'needs_review',
            params: { documentType, fieldId: field.fieldId, value: masked, iso: parsed.iso },
            evidence,
          });
        }
        break;
      }

      case 'person_name':
      case 'text':
        break;
    }
  }

  return drafts;
}

interface NameEntry {
  documentType: DocumentType;
  fieldId: FieldId;
  field: ExpectedField;
  value: string;
  confidence: number;
}

/**
 * Compare the person's name across documents.
 *
 * Names are grouped into clusters of "the same name written differently". One cluster means the
 * documents agree. More than one means a single finding per disagreeing cluster, measured against
 * the cluster the most documents agree on — so a demo with one wrong document yields one clear
 * finding, not three overlapping ones.
 *
 * Names that Textract read with low confidence are left out entirely: they already carry an
 * "unclear" finding, and comparing characters nobody could read would invent a second problem.
 */
function checkNamesAcrossDocuments(
  extractedByDocument: Map<DocumentType, ExtractedFields>,
  template: Template,
  reportedUnclear: Set<string>,
): FindingDraft[] {
  const entries: NameEntry[] = [];

  for (const fieldId of template.crossDocumentNameFields) {
    const documentType = documentTypeForField(template, fieldId);
    const field = expectedFieldById(template, fieldId);
    if (!documentType || !field) continue;
    const extracted = extractedByDocument.get(documentType)?.[fieldId];
    if (!extracted) continue;
    if (reportedUnclear.has(`${documentType}:${fieldId}`)) continue;
    entries.push({
      documentType,
      fieldId,
      field,
      value: extracted.value,
      confidence: extracted.confidence,
    });
  }

  if (entries.length < 2) return [];

  const clusters: NameEntry[][] = [];
  for (const entry of entries) {
    const existing = clusters.find(
      (cluster) => compareNames(cluster[0]!.value, entry.value).relation === 'match',
    );
    if (existing) existing.push(entry);
    else clusters.push([entry]);
  }

  if (clusters.length < 2) return [];

  const containsMarksheet = (cluster: NameEntry[]): number =>
    cluster.some((entry) => entry.documentType === 'class_xii_marksheet') ? 1 : 0;

  const ranked = [...clusters].sort(
    (a, b) => b.length - a.length || containsMarksheet(b) - containsMarksheet(a),
  );
  const reference = ranked[0]!;

  return ranked.slice(1).map((cluster) => {
    const outlier = cluster[0]!;
    const referenceEntry = reference[0]!;
    const { relation } = compareNames(referenceEntry.value, outlier.value);
    const outlierDocumentTypes = cluster.map((entry) => entry.documentType);
    const referenceDocumentTypes = reference.map((entry) => entry.documentType);

    return {
      ruleId: relation === 'minor' ? 'name_minor_difference' : 'name_material_difference',
      status: 'needs_review' as FindingStatus,
      documentTypes: [...outlierDocumentTypes, ...referenceDocumentTypes],
      fieldId: outlier.fieldId,
      params: {
        outlierName: outlier.value,
        referenceName: referenceEntry.value,
        outlierDocumentTypes: outlierDocumentTypes.join(','),
        referenceDocumentTypes: referenceDocumentTypes.join(','),
      },
      evidence: [...cluster, ...reference].map((entry) =>
        evidenceFor(entry.documentType, entry.field, entry.value, entry.confidence),
      ),
    };
  });
}

function overallStatusFrom(findings: Finding[]): OverallStatus {
  if (findings.some((finding) => finding.status === 'missing')) return 'incomplete';
  if (findings.length > 0) return 'needs_review';
  return 'no_issues_found';
}

export function analyze({ documents, template, now }: AnalyzeInput): AnalysisOutcome {
  const drafts: FindingDraft[] = [];
  const readings: DocumentReading[] = [];
  const extractedByDocument = new Map<DocumentType, ExtractedFields>();
  const reportedUnclear = new Set<string>();

  const suppliedTypes = new Set(documents.map((document) => document.documentType));
  const missingDocumentTypes = template.requiredDocuments
    .map((required) => required.documentType)
    .filter((documentType) => !suppliedTypes.has(documentType));

  for (const documentType of missingDocumentTypes) {
    drafts.push({
      ruleId: 'required_document_missing',
      status: 'missing',
      documentTypes: [documentType],
      params: { documentType },
    });
  }

  for (const document of documents) {
    const fields = extractFields(document, template);
    extractedByDocument.set(document.documentType, fields);

    readings.push({
      documentType: document.documentType,
      fields: expectedFieldsFor(template, document.documentType).flatMap((field) => {
        const extracted = fields[field.fieldId];
        return extracted
          ? [
              {
                fieldId: field.fieldId,
                value: maskFieldValue(field, extracted.value),
                ocrConfidence: extracted.confidence,
              },
            ]
          : [];
      }),
    });

    const documentDrafts = checkDocument(document.documentType, fields, template, now);
    for (const draft of documentDrafts) {
      if (draft.ruleId === 'field_unclear_low_confidence' && draft.fieldId) {
        reportedUnclear.add(`${document.documentType}:${draft.fieldId}`);
      }
    }
    drafts.push(...documentDrafts);
  }

  drafts.push(...checkNamesAcrossDocuments(extractedByDocument, template, reportedUnclear));

  const findings = drafts.map(toFinding);

  return {
    overallStatus: overallStatusFrom(findings),
    findings,
    readings,
    missingDocumentTypes,
  };
}
