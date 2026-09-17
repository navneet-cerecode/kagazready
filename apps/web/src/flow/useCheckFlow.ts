import {
  DOCUMENT_TYPES,
  SCHOLARSHIP_READINESS_TEMPLATE,
  type AnalysisResponse,
  type DocumentType,
  type Language,
} from '@kagazready/contracts';
import { useCallback, useReducer, useRef } from 'react';
import {
  ApiClientError,
  createAnalysis,
  deleteAnalysis,
  getAnalysis,
  replaceDocument,
  requestUpload,
  uploadToS3,
} from '../api/client.js';
import { UI, type UiStrings } from '../i18n/ui.js';

/**
 * The whole journey as one reducer.
 *
 * compose -> uploading -> analysing -> result -> (replace -> uploading -> analysing -> result)*
 * -> deleted -> compose
 *
 * Every transition that spends money on AWS is explicit: there is no auto-check on file selection,
 * and a replacement re-runs only when the user asks for it.
 */

export type Phase = 'compose' | 'uploading' | 'analysing' | 'result' | 'deleting' | 'deleted';

export interface Slot {
  documentType: DocumentType;
  file: File | null;
  /** Set once the file is safely in S3. Cleared when the file changes. */
  objectKey: string | null;
  progress: number;
  /** A client-side validation message for this slot, already localised. */
  problem: string | null;
}

export interface FlowError {
  message: string;
  correlationId?: string;
}

export interface FlowState {
  language: Language;
  phase: Phase;
  analysisId: string | null;
  slots: Record<DocumentType, Slot>;
  result: AnalysisResponse | null;
  error: FlowError | null;
  /** True when the current set came from the built-in sample documents. */
  sampleMode: boolean;
  sampleLoading: boolean;
  /** The document being replaced, so the UI can keep the rest of the result on screen. */
  replacing: DocumentType | null;
}

type Action =
  | { type: 'set_language'; language: Language }
  | {
      type: 'set_file';
      documentType: DocumentType;
      file: File | null;
      problem: string | null;
      /** True when the file is one of the shipped samples, so sample mode is kept. */
      sample?: boolean;
    }
  | { type: 'sample_loading'; loading: boolean }
  | { type: 'sample_loaded'; files: Partial<Record<DocumentType, File>> }
  | { type: 'phase'; phase: Phase }
  | { type: 'analysis_started'; analysisId: string }
  | { type: 'upload_progress'; documentType: DocumentType; progress: number }
  | { type: 'uploaded'; documentType: DocumentType; objectKey: string }
  | { type: 'result'; result: AnalysisResponse }
  | { type: 'replacing'; documentType: DocumentType | null }
  | { type: 'error'; error: FlowError | null }
  | { type: 'reset' };

const emptySlot = (documentType: DocumentType): Slot => ({
  documentType,
  file: null,
  objectKey: null,
  progress: 0,
  problem: null,
});

export const initialState = (language: Language): FlowState => ({
  language,
  phase: 'compose',
  analysisId: null,
  slots: {
    class_xii_marksheet: emptySlot('class_xii_marksheet'),
    income_certificate: emptySlot('income_certificate'),
    bank_proof: emptySlot('bank_proof'),
  },
  result: null,
  error: null,
  sampleMode: false,
  sampleLoading: false,
  replacing: null,
});

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'set_language':
      return { ...state, language: action.language };

    case 'set_file':
      return {
        ...state,
        sampleMode: action.sample ?? false,
        error: null,
        slots: {
          ...state.slots,
          [action.documentType]: {
            ...state.slots[action.documentType],
            file: action.file,
            objectKey: null,
            progress: 0,
            problem: action.problem,
          },
        },
      };

    case 'sample_loading':
      return { ...state, sampleLoading: action.loading, error: null };

    case 'sample_loaded': {
      const slots = { ...state.slots };
      for (const documentType of DOCUMENT_TYPES) {
        const file = action.files[documentType] ?? null;
        slots[documentType] = { ...emptySlot(documentType), file };
      }
      return { ...state, slots, sampleMode: true, sampleLoading: false, error: null };
    }

    case 'phase':
      return { ...state, phase: action.phase };

    case 'analysis_started':
      return { ...state, analysisId: action.analysisId };

    case 'upload_progress':
      return {
        ...state,
        slots: {
          ...state.slots,
          [action.documentType]: { ...state.slots[action.documentType], progress: action.progress },
        },
      };

    case 'uploaded':
      return {
        ...state,
        slots: {
          ...state.slots,
          [action.documentType]: {
            ...state.slots[action.documentType],
            objectKey: action.objectKey,
            progress: 1,
          },
        },
      };

    case 'result':
      return { ...state, result: action.result, phase: 'result', replacing: null, error: null };

    case 'replacing':
      return { ...state, replacing: action.documentType };

    case 'error':
      return { ...state, error: action.error };

    case 'reset':
      return initialState(state.language);
  }
}

const { maxFileBytes, acceptedContentTypes } = SCHOLARSHIP_READINESS_TEMPLATE.uploadConstraints;

/** Client-side check before any upload is requested. The server re-checks everything. */
export function validateFile(file: File, strings: UiStrings): string | null {
  if (!acceptedContentTypes.includes(file.type)) return strings.errorFileType;
  if (file.size > maxFileBytes) return strings.errorFileSize;
  return null;
}

function describeError(error: unknown, strings: UiStrings): FlowError {
  if (error instanceof ApiClientError) {
    const byCode: Partial<Record<ApiClientError['code'], string>> = {
      capacity_reached: strings.errorCapacity,
      not_found: strings.errorExpired,
      network: strings.errorNetwork,
      upstream_unavailable: strings.errorUnavailable,
      unsupported_media_type: strings.errorFileType,
      payload_too_large: strings.errorFileSize,
    };
    return {
      message: byCode[error.code] ?? error.message ?? strings.errorGeneric,
      correlationId: error.correlationId,
    };
  }
  return { message: strings.errorGeneric };
}

/** The sample documents shipped with the app. Paths are served from /public. */
export const SAMPLE_FILES: Record<DocumentType, string> & { bankProofCorrected: string } = {
  class_xii_marksheet: '/samples/marksheet.png',
  income_certificate: '/samples/income-certificate.png',
  bank_proof: '/samples/bank-proof-needs-review.png',
  bankProofCorrected: '/samples/bank-proof-corrected.png',
};

async function fetchAsFile(path: string, name: string): Promise<File> {
  const response = await fetch(path);
  if (!response.ok) throw new ApiClientError('network', `Could not load ${name}`);
  const blob = await response.blob();
  return new File([blob], name, { type: 'image/png' });
}

export function useCheckFlow(initialLanguage: Language) {
  const [state, dispatch] = useReducer(reducer, initialLanguage, initialState);
  // Always the latest state for async work, without re-creating callbacks on every render.
  const latest = useRef(state);
  latest.current = state;

  const strings = () => UI[latest.current.language];

  const setLanguage = useCallback(async (language: Language) => {
    document.documentElement.lang = language;
    dispatch({ type: 'set_language', language });
    const { analysisId, phase } = latest.current;
    if (phase === 'result' && analysisId) {
      try {
        dispatch({ type: 'result', result: await getAnalysis(analysisId, language) });
      } catch (error) {
        dispatch({ type: 'error', error: describeError(error, UI[language]) });
      }
    }
  }, []);

  const setFile = useCallback((documentType: DocumentType, file: File | null) => {
    const problem = file ? validateFile(file, strings()) : null;
    dispatch({ type: 'set_file', documentType, file: problem ? null : file, problem });
  }, []);

  const loadSamples = useCallback(async () => {
    dispatch({ type: 'sample_loading', loading: true });
    try {
      const [marksheet, income, bank] = await Promise.all([
        fetchAsFile(SAMPLE_FILES.class_xii_marksheet, 'marksheet.png'),
        fetchAsFile(SAMPLE_FILES.income_certificate, 'income-certificate.png'),
        fetchAsFile(SAMPLE_FILES.bank_proof, 'bank-proof.png'),
      ]);
      dispatch({
        type: 'sample_loaded',
        files: { class_xii_marksheet: marksheet, income_certificate: income, bank_proof: bank },
      });
    } catch (error) {
      dispatch({ type: 'sample_loading', loading: false });
      dispatch({ type: 'error', error: describeError(error, strings()) });
    }
  }, []);

  /**
   * Upload one file and return its object key.
   *
   * The file is passed in rather than read from state: a dispatch followed immediately by an
   * async continuation sees the *previous* render's state through the ref, which once made a
   * replacement silently re-use the old object key and re-run the analysis on unchanged documents.
   */
  const uploadFile = async (documentType: DocumentType, file: File): Promise<string> => {
    const presign = await requestUpload({
      analysisId: latest.current.analysisId ?? undefined,
      documentType,
      file,
    });
    if (!latest.current.analysisId) {
      dispatch({ type: 'analysis_started', analysisId: presign.analysisId });
      // Make the id visible to the next upload in this same async run.
      latest.current = { ...latest.current, analysisId: presign.analysisId };
    }
    await uploadToS3(presign.upload, file, (progress) =>
      dispatch({ type: 'upload_progress', documentType, progress }),
    );
    dispatch({ type: 'uploaded', documentType, objectKey: presign.objectKey });
    return presign.objectKey;
  };

  const runCheck = useCallback(async () => {
    // Read the slots once, now: this is the state the user pressed the button against.
    const slots = latest.current.slots;
    const present = DOCUMENT_TYPES.flatMap((type) => {
      const slot = slots[type];
      return slot.file ? [{ documentType: type, file: slot.file, objectKey: slot.objectKey }] : [];
    });
    if (present.length === 0) return;

    dispatch({ type: 'error', error: null });
    dispatch({ type: 'phase', phase: 'uploading' });
    try {
      const documents = [];
      for (const { documentType, file, objectKey: existing } of present) {
        // A file already in S3 from an earlier attempt is not uploaded twice.
        const objectKey = existing ?? (await uploadFile(documentType, file));
        documents.push({ documentType, objectKey });
      }
      const analysisId = latest.current.analysisId;
      if (!analysisId) throw new Error('analysis id missing after upload');

      dispatch({ type: 'phase', phase: 'analysing' });
      const result = await createAnalysis({
        analysisId,
        language: latest.current.language,
        documents,
      });
      dispatch({ type: 'result', result });
    } catch (error) {
      dispatch({ type: 'phase', phase: 'compose' });
      dispatch({ type: 'error', error: describeError(error, strings()) });
    }
  }, []);

  /** Replace one document in an existing result and re-run. */
  const replaceOne = useCallback(async (documentType: DocumentType, file: File, sample = false) => {
    const problem = validateFile(file, strings());
    if (problem) {
      dispatch({ type: 'error', error: { message: problem } });
      return;
    }
    const analysisId = latest.current.analysisId;
    if (!analysisId) return;

    dispatch({ type: 'set_file', documentType, file, problem: null, sample });
    dispatch({ type: 'replacing', documentType });
    dispatch({ type: 'phase', phase: 'uploading' });
    try {
      const objectKey = await uploadFile(documentType, file);
      dispatch({ type: 'phase', phase: 'analysing' });
      const result = await replaceDocument({
        analysisId,
        documentType,
        objectKey,
        language: latest.current.language,
      });
      dispatch({ type: 'result', result });
    } catch (error) {
      dispatch({ type: 'replacing', documentType: null });
      dispatch({ type: 'phase', phase: 'result' });
      dispatch({ type: 'error', error: describeError(error, strings()) });
    }
  }, []);

  const replaceWithCorrectedSample = useCallback(async () => {
    try {
      const file = await fetchAsFile(SAMPLE_FILES.bankProofCorrected, 'bank-proof-corrected.png');
      await replaceOne('bank_proof', file, true);
    } catch (error) {
      dispatch({ type: 'error', error: describeError(error, strings()) });
    }
  }, [replaceOne]);

  const removeEverything = useCallback(async () => {
    const analysisId = latest.current.analysisId;
    dispatch({ type: 'phase', phase: 'deleting' });
    try {
      if (analysisId) await deleteAnalysis(analysisId);
      dispatch({ type: 'reset' });
      dispatch({ type: 'phase', phase: 'deleted' });
    } catch (error) {
      dispatch({ type: 'phase', phase: 'result' });
      dispatch({ type: 'error', error: describeError(error, strings()) });
    }
  }, []);

  const startAgain = useCallback(() => dispatch({ type: 'reset' }), []);
  const dismissError = useCallback(() => dispatch({ type: 'error', error: null }), []);

  return {
    state,
    strings: UI[state.language],
    setLanguage,
    setFile,
    loadSamples,
    runCheck,
    replaceOne,
    replaceWithCorrectedSample,
    removeEverything,
    startAgain,
    dismissError,
  };
}

export type CheckFlow = ReturnType<typeof useCheckFlow>;
