import {
  type AnalysisResponse,
  type DocumentType,
  type Language,
  type PresentedFinding,
} from '@kagazready/contracts';
import { documentTypeLabel, fieldLabel, statusCopy } from '@kagazready/rules';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useId, useRef, useState } from 'react';
import type { UiStrings } from '../i18n/ui.js';
import { Icon, type IconName } from './Icon.js';

/**
 * The result, laid out as a proof sheet that has been read.
 *
 * The status token comes first and says one of three things. Below it, every finding is a mark in
 * the margin: a coloured stroke in the gutter, the title, the exact masked text it was read from,
 * the plain-words note, why it matters, what to do — and the control that does it, right there,
 * so the remedy is pinned to the mark the way the mark is pinned to its evidence.
 */

interface ResultSheetProps {
  result: AnalysisResponse;
  language: Language;
  strings: UiStrings;
  busy: boolean;
  sampleMode: boolean;
  onReplace: (documentType: DocumentType, file: File) => void;
  onUseCorrectedSample: () => void;
  onDelete: () => void;
}

const STATUS_ICON: Record<AnalysisResponse['status'], IconName> = {
  incomplete: 'missing',
  needs_review: 'mark',
  no_issues_found: 'check',
};

const STATUS_TONE: Record<AnalysisResponse['status'], string> = {
  incomplete: 'border-red text-red-ink bg-red-tint',
  needs_review: 'border-amber text-amber-ink bg-amber-tint',
  no_issues_found: 'border-ink text-ink bg-paper-bright',
};

/** Only a real change in what was found earns the withdraw sequence. A language switch does not. */
const findingsSignature = (result: AnalysisResponse) =>
  `${result.status}|${result.findings.map((f) => f.id).join(',')}`;

export function ResultSheet({
  result,
  language,
  strings,
  busy,
  sampleMode,
  onReplace,
  onUseCorrectedSample,
  onDelete,
}: ResultSheetProps) {
  const container = useRef<HTMLDivElement>(null);

  /*
   * The one authored sequence. When the findings change after marks were on the sheet, the old
   * marks withdraw into the margin before the new state appears. React would swap the DOM at once,
   * so the sheet displays a held copy of the result until the exit has played.
   */
  const [shown, setShown] = useState(result);
  const pendingResult = useRef<AnalysisResponse | null>(null);

  useEffect(() => {
    if (result === shown) return;
    pendingResult.current = result;
    const marks = container.current?.querySelectorAll<HTMLElement>('[data-mark]') ?? [];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sameFindings = findingsSignature(result) === findingsSignature(shown);

    if (marks.length === 0 || reduce || sameFindings) {
      setShown(result);
      return;
    }

    const tween = gsap.to(marks, {
      x: -14,
      opacity: 0,
      duration: 0.24,
      ease: 'power2.in',
      stagger: 0.04,
      onComplete: () => {
        if (pendingResult.current) setShown(pendingResult.current);
      },
    });
    return () => {
      tween.kill();
    };
  }, [result, shown]);

  const shownSignature = findingsSignature(shown);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-status]', { y: 6, opacity: 0, duration: 0.32, ease: 'power3.out' });
        gsap.from('[data-mark]', {
          x: -10,
          opacity: 0,
          duration: 0.4,
          ease: 'power3.out',
          stagger: 0.07,
          delay: 0.08,
          clearProps: 'all',
        });
      });
      return () => mm.revert();
    },
    { scope: container, dependencies: [shownSignature] },
  );

  const status = statusCopy(shown.status, language);
  const present = new Set(shown.documentTypesPresent);
  const expires = new Date(shown.expiresAt);
  const hasBankMark = shown.findings.some((f) => f.documentTypes[0] === 'bank_proof');

  return (
    <div ref={container}>
      <section aria-labelledby="status-heading">
        <h1 id="status-heading" className="sr-only">
          {strings.resultHeading}
        </h1>
        <div data-status className="flex flex-col gap-3">
          <p
            className={`m-0 inline-flex w-fit items-center gap-2 rounded-sm border px-3 py-1.5 font-display text-heading ${STATUS_TONE[shown.status]}`}
            role="status"
            aria-live="polite"
          >
            <Icon name={STATUS_ICON[shown.status]} size={20} />
            <span data-testid="status-label">{status.label}</span>
          </p>
          <p className="m-0 max-w-[62ch] text-body text-graphite">{status.summary}</p>
        </div>
      </section>

      {/* In sample mode the demo's one obvious next step sits right under the status. */}
      {sampleMode && hasBankMark && (
        <button
          type="button"
          onClick={onUseCorrectedSample}
          disabled={busy}
          data-testid="use-corrected-sample"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-teal px-5 text-body font-semibold text-paper-bright transition-colors duration-(--duration-micro) hover:bg-teal-deep active:bg-teal-deep disabled:opacity-60 sm:w-auto"
        >
          <Icon name="refresh" size={18} />
          {strings.useCorrectedSample}
        </button>
      )}

      <section className="mt-8" aria-labelledby="marks-heading">
        <h2 id="marks-heading" className="font-display text-heading m-0 text-ink">
          {strings.findingsHeading}
          {shown.findings.length > 0 && (
            <>
              {' '}
              <span className="tabular text-graphite-soft" aria-label={`${shown.findings.length}`}>
                {shown.findings.length}
              </span>
            </>
          )}
        </h2>

        {shown.findings.length === 0 ? (
          <p
            className="hairline-t mt-3 pt-4 text-body text-graphite-soft"
            data-testid="no-findings"
          >
            {strings.noFindingsBody}
          </p>
        ) : (
          <ol className="hairline-t mt-3 m-0 list-none p-0">
            {shown.findings.map((finding) => (
              <FindingMark
                key={finding.id}
                finding={finding}
                language={language}
                strings={strings}
                busy={busy}
                present={present.has(finding.documentTypes[0] ?? 'bank_proof')}
                onReplace={onReplace}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10" aria-labelledby="readings-heading">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-body text-ink [&::-webkit-details-marker]:hidden">
            <Icon
              name="chevron"
              size={18}
              className="transition-transform duration-(--duration-micro) group-open:rotate-180"
            />
            <span id="readings-heading" className="font-display text-heading">
              {strings.readingsHeading}
            </span>
          </summary>
          <p className="text-small mt-2 mb-0 text-graphite-soft">{strings.readingsIntro}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            {shown.readings.map((reading) => (
              <div key={reading.documentType}>
                <h3 className="text-small m-0 font-semibold text-ink">
                  {documentTypeLabel(reading.documentType, language)}
                </h3>
                <dl className="hairline-t mt-2 mb-0">
                  {reading.fields.map((field) => (
                    <div key={field.fieldId} className="hairline-b py-1.5">
                      <dt className="text-micro text-graphite-soft first-letter:uppercase">
                        {fieldLabel(field.fieldId, language)}
                      </dt>
                      <dd className="tabular m-0 flex items-baseline justify-between gap-3 text-small text-graphite">
                        <span className="font-mono">{field.value}</span>
                        <span className="text-micro whitespace-nowrap text-graphite-soft">
                          {Math.round(field.ocrConfidence)}%
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Delete sits on its own, below everything, with room around it: nothing to hit by accident. */}
      <section className="mt-14 mb-4" aria-labelledby="delete-heading">
        <DeleteControl strings={strings} busy={busy} onDelete={onDelete} />
        <p className="text-micro mt-4 mb-0 text-graphite-soft">
          {strings.expires}{' '}
          <time dateTime={shown.expiresAt} className="tabular">
            {expires.toLocaleString(language === 'en' ? 'en-IN' : language, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            })}
          </time>
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface FindingMarkProps {
  finding: PresentedFinding;
  language: Language;
  strings: UiStrings;
  busy: boolean;
  /** Whether the document this mark concerns was uploaded at all. */
  present: boolean;
  onReplace: (documentType: DocumentType, file: File) => void;
}

function FindingMark({ finding, language, strings, busy, present, onReplace }: FindingMarkProps) {
  const missing = finding.status === 'missing';
  const tone = missing ? 'mark-red' : 'mark-amber';
  const iconName: IconName = missing ? 'missing' : 'mark';
  const statusLabel = missing ? strings.markMissing : statusCopy('needs_review', language).label;
  const explanation = finding.explanation;
  const subject = finding.documentTypes[0] ?? 'bank_proof';

  return (
    <li
      data-mark
      data-testid="finding"
      className={`${tone} mark-stroke hairline-b py-5 pl-5 sm:pl-7`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-heading m-0 flex items-start gap-2 text-ink">
          <Icon
            name={iconName}
            size={20}
            className={`mt-1 shrink-0 ${missing ? 'text-red' : 'text-amber'}`}
          />
          <span>
            <span className="sr-only">{statusLabel}: </span>
            {finding.text.title}
          </span>
        </h3>
        <p className="text-small m-0 text-graphite-soft">
          <span
            className={`font-semibold ${missing ? 'text-red-ink' : 'text-amber-ink'}`}
            aria-hidden="true"
          >
            {statusLabel}
          </span>
          {' · '}
          {finding.documentTypes.map((d) => documentTypeLabel(d, language)).join(' · ')}
        </p>
      </div>

      {finding.evidence.length > 0 && (
        <dl className="mt-3 mb-0 grid gap-1">
          {finding.evidence.map((item, index) => (
            <div key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <dt className="text-micro text-graphite-soft">
                {strings.evidence} · {documentTypeLabel(item.documentType, language)}
              </dt>
              <dd className="tabular m-0 text-small text-graphite">
                <span className="font-mono">{item.value}</span>
                {item.ocrConfidence !== null && (
                  <span className="ml-2 text-micro whitespace-nowrap text-graphite-soft">
                    {strings.confidence} {Math.round(item.ocrConfidence)}%
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Plain words first: it is the sentence a parent or a first-time reader needs. */}
      {explanation && (
        <div className="mt-3 rounded-sm bg-paper-bright px-3 py-2">
          <p className="m-0 text-small text-graphite">
            <span className="block text-micro font-semibold text-graphite-soft">
              {explanation.source === 'fallback' ? strings.plainNoteFallback : strings.plainNote}
            </span>
            <span lang={explanation.language}>{explanation.text}</span>
          </p>
          {explanation.translationUnavailable && (
            <p className="text-micro mt-1 mb-0 text-graphite-soft">
              {strings.plainNoteUnavailable}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="m-0 text-small text-graphite">
          <span className="block text-micro font-semibold text-graphite-soft">
            {strings.reason}
          </span>
          {finding.text.reason}
        </p>
        <p className="m-0 text-small text-graphite">
          <span className="block text-micro font-semibold text-graphite-soft">
            {strings.suggestedAction}
          </span>
          {finding.text.suggestedAction}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <DocumentControl
          documentType={subject}
          present={present}
          language={language}
          strings={strings}
          disabled={busy}
          onFile={onReplace}
        />
        <p className="text-micro m-0 text-graphite-soft">
          {strings.decidedBy} <code className="font-mono">{finding.ruleId}</code>
        </p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------

interface DocumentControlProps {
  documentType: DocumentType;
  present: boolean;
  language: Language;
  strings: UiStrings;
  disabled: boolean;
  onFile: (documentType: DocumentType, file: File) => void;
}

/** "Add photo: Bank proof" when the document was never uploaded, "Replace photo: …" when it was. */
function DocumentControl({
  documentType,
  present,
  language,
  strings,
  disabled,
  onFile,
}: DocumentControlProps) {
  const id = useId();
  const label = documentTypeLabel(documentType, language);
  const verb = present ? strings.replacePhotoFor : strings.addPhotoFor;
  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        disabled={disabled}
        aria-label={`${verb}: ${label}`}
        data-testid={`document-control-${documentType}`}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(documentType, file);
          event.currentTarget.value = '';
        }}
      />
      <label
        htmlFor={id}
        className={`text-small inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm border border-line-strong px-3 text-ink transition-colors duration-(--duration-micro) hover:bg-paper-deep active:bg-paper-deep has-[:focus-visible]:ring-focus ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Icon name={present ? 'refresh' : 'plus'} size={16} />
        {verb}: {label}
      </label>
    </>
  );
}

// ---------------------------------------------------------------------------

function DeleteControl({
  strings,
  busy,
  onDelete,
}: {
  strings: UiStrings;
  busy: boolean;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="hairline-t pt-6">
      <h2 id="delete-heading" className="font-display text-heading m-0 text-ink">
        {strings.deleteHeading}
      </h2>
      <p className="mt-1 mb-0 max-w-[62ch] text-small text-graphite">{strings.deleteBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              data-testid="confirm-delete"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-red px-4 text-small font-semibold text-paper-bright hover:bg-red-ink active:bg-red-ink disabled:opacity-60"
            >
              <Icon name="trash" size={16} />
              {strings.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="min-h-11 text-small text-graphite-soft underline underline-offset-4"
            >
              {strings.deleteCancel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            data-testid="delete"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-red px-4 text-small font-semibold text-red-ink hover:bg-red-tint active:bg-red-tint disabled:opacity-60"
          >
            <Icon name="trash" size={16} />
            {strings.deleteAction}
          </button>
        )}
      </div>
    </div>
  );
}
