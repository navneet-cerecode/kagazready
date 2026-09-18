import { DOCUMENT_TYPES, type DocumentType } from '@kagazready/contracts';
import { documentTypeLabel } from '@kagazready/rules';
import { useId } from 'react';
import type { FlowState } from '../flow/useCheckFlow.js';
import type { UiStrings } from '../i18n/ui.js';
import { Icon } from './Icon.js';

/**
 * The proof sheet: three ruled rows, one per document type.
 *
 * Not cards. A sheet reads top to bottom as one object, which is what a document set is. Each row
 * carries its number in the gutter, the document's name, what has been added, and the one control
 * that makes sense right now.
 */

interface ProofSheetProps {
  state: FlowState;
  strings: UiStrings;
  onFile: (documentType: DocumentType, file: File | null) => void;
  disabled: boolean;
}

export function ProofSheet({ state, strings, onFile, disabled }: ProofSheetProps) {
  return (
    <ol className="rule-y m-0 list-none p-0" aria-label={strings.yourDocuments}>
      {DOCUMENT_TYPES.map((documentType, index) => (
        <SheetRow
          key={documentType}
          index={index + 1}
          documentType={documentType}
          state={state}
          strings={strings}
          onFile={onFile}
          disabled={disabled}
        />
      ))}
    </ol>
  );
}

interface SheetRowProps extends ProofSheetProps {
  index: number;
  documentType: DocumentType;
}

function SheetRow({ index, documentType, state, strings, onFile, disabled }: SheetRowProps) {
  const inputId = useId();
  const slot = state.slots[documentType];
  const label = documentTypeLabel(documentType, state.language);
  const uploading = state.phase === 'uploading' && slot.file && !slot.objectKey;

  return (
    <li className="hairline-b grid grid-cols-[2.25rem_1fr] gap-x-3 py-4 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:py-5">
      <span
        className="tabular font-display text-heading pt-0.5 text-graphite-soft select-none"
        aria-hidden="true"
      >
        {index}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-heading m-0 text-ink">{label}</h2>
          {slot.file && !uploading && (
            <button
              type="button"
              onClick={() => onFile(documentType, null)}
              disabled={disabled}
              className="min-h-11 text-small text-graphite-soft underline underline-offset-4 hover:text-red-ink disabled:opacity-50"
            >
              {strings.remove}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {slot.file ? (
            <p className="text-small m-0 flex min-w-0 items-center gap-2 text-graphite">
              <Icon name={slot.objectKey ? 'check' : 'photo'} size={16} className="shrink-0" />
              <span className="truncate">{slot.file.name}</span>
              <span className="tabular text-graphite-soft">
                {(slot.file.size / 1024).toFixed(0)} kB
              </span>
            </p>
          ) : (
            <p className="text-small m-0 text-graphite-soft">{strings.fileHint}</p>
          )}

          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              onFile(documentType, file);
              event.currentTarget.value = '';
            }}
            aria-label={`${strings.chooseFile} ${label}`}
          />
          {!uploading && (
            <label
              htmlFor={inputId}
              className={`text-small inline-flex cursor-pointer items-center gap-1.5 min-h-11 rounded-sm border border-line-strong px-3 text-ink transition-colors duration-(--duration-micro) hover:bg-paper-deep active:bg-paper-deep has-[:focus-visible]:ring-focus ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            >
              <Icon name={slot.file ? 'refresh' : 'plus'} size={16} />
              {slot.file ? strings.replacePhoto : strings.addPhoto}
            </label>
          )}
        </div>

        {uploading && (
          <div className="mt-3" role="status" aria-live="polite">
            <div className="flex justify-between text-micro text-graphite-soft">
              <span>{strings.uploading}</span>
              <span className="tabular">
                {slot.progress > 0 ? `${Math.round(slot.progress * 100)}%` : '…'}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-hair bg-paper-deep">
              <div
                className="h-full bg-teal transition-[width] duration-(--duration-micro) ease-linear"
                style={{ width: `${Math.round(slot.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {slot.problem && (
          <p className="text-small mt-2 mb-0 text-red-ink" role="alert">
            {slot.problem}
          </p>
        )}
      </div>
    </li>
  );
}
