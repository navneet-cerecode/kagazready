import { DOCUMENT_TYPES, type Language } from '@kagazready/contracts';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { ArchitectureDrawer } from './components/ArchitectureDrawer.js';
import { Icon } from './components/Icon.js';
import { ProofSheet } from './components/ProofSheet.js';
import { ResultSheet } from './components/ResultSheet.js';
import { useCheckFlow } from './flow/useCheckFlow.js';
import { LANGUAGE_OPTIONS } from './i18n/ui.js';

/** Pick the interface language once, from the browser, falling back to English. */
function initialLanguage(): Language {
  const preferred = (navigator.languages ?? [navigator.language]).map((tag) =>
    tag.toLowerCase().slice(0, 2),
  );
  if (preferred.includes('hi')) return 'hi';
  if (preferred.includes('gu')) return 'gu';
  return 'en';
}

export default function App() {
  const flow = useCheckFlow(initialLanguage());
  const { state, strings } = flow;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const main = useRef<HTMLElement>(null);

  const busy =
    state.phase === 'uploading' || state.phase === 'analysing' || state.phase === 'deleting';

  // The chosen language must reach <html lang> — including the auto-detected one — or the Indic
  // font rules and screen-reader voices never switch for the very users detection exists for.
  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);

  // A new result is read from the top: the status token, then the marks.
  useEffect(() => {
    if (!state.result) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [state.result]);

  const anyFile = DOCUMENT_TYPES.some((type) => state.slots[type].file);
  // The sheet stays while files upload (its rows carry the progress), then gives way to the
  // reading state. Keeping both meant that on a phone "Reading your documents" sat two screens
  // below a disabled button, and nothing visible moved for the whole Textract wait.
  const showSheet = state.phase === 'compose' || (state.phase === 'uploading' && !state.replacing);

  /* Phase handoff: the incoming section rises into place. Reduced motion: it is simply there. */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-phase]', {
          y: 10,
          opacity: 0,
          duration: 0.3,
          ease: 'power3.out',
          clearProps: 'all',
        });
      });
      return () => mm.revert();
    },
    { scope: main, dependencies: [state.phase === 'result', state.phase === 'deleted', showSheet] },
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5 sm:py-7">
        <p className="font-display m-0 text-[1.375rem] font-semibold tracking-[-0.01em] text-ink">
          KagazReady
        </p>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="hidden min-h-11 text-small text-graphite-soft underline underline-offset-4 hover:text-ink sm:inline"
          >
            {strings.howItWorks}
          </button>
          <LanguageSwitch
            value={state.language}
            label={strings.languageLabel}
            onChange={(language) => void flow.setLanguage(language)}
          />
        </div>
      </header>

      <main ref={main} className="flex-1 pb-12">
        {state.error && (
          <div
            role="alert"
            className="hairline mb-6 flex items-start justify-between gap-3 rounded-sm bg-paper-bright px-4 py-3"
          >
            <p className="m-0 text-small text-red-ink">
              {state.error.message}
              {state.error.correlationId && (
                <span className="ml-2 font-mono text-micro text-graphite-soft">
                  {state.error.correlationId}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={flow.dismissError}
              className="min-h-11 text-small text-graphite-soft underline underline-offset-4"
            >
              {strings.dismiss}
            </button>
          </div>
        )}

        {showSheet && (
          <section data-phase aria-labelledby="compose-heading">
            <h1
              id="compose-heading"
              className="font-display m-0 max-w-[22ch] text-display font-medium text-ink text-balance sm:text-display-lg"
            >
              {strings.tagline}
            </h1>
            <p className="mt-4 mb-8 max-w-[62ch] text-body text-graphite">{strings.intro}</p>

            <ProofSheet state={state} strings={strings} onFile={flow.setFile} disabled={busy} />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <button
                type="button"
                onClick={() => void flow.runCheck()}
                disabled={!anyFile || busy}
                data-testid="check"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-teal px-6 py-3 text-body font-semibold text-paper-bright transition-colors duration-(--duration-micro) hover:bg-teal-deep active:bg-teal-deep disabled:cursor-not-allowed disabled:border disabled:border-line-strong disabled:bg-paper-deep disabled:text-graphite-soft"
              >
                {strings.checkDocuments}
                <Icon name="arrow" size={18} />
              </button>
              {/* Hidden once the student has attached their own photos, so it cannot overwrite them. */}
              {(!anyFile || state.sampleMode) && (
                <button
                  type="button"
                  onClick={() => void flow.loadSamples()}
                  disabled={busy || state.sampleLoading}
                  data-testid="try-sample"
                  className="min-h-11 text-small text-teal underline underline-offset-4 hover:text-teal-deep disabled:opacity-60"
                >
                  {state.sampleLoading ? `${strings.sampleLoading}…` : strings.trySample}
                </button>
              )}
            </div>
            {state.sampleMode && (
              <p className="mt-3 mb-0 max-w-[62ch] text-small text-graphite-soft">
                {strings.sampleNote}
              </p>
            )}

            <p className="hairline-t mt-8 max-w-[62ch] pt-4 text-small text-graphite-soft">
              {strings.notThis}
            </p>
            <p className="mt-2 mb-0 max-w-[62ch] text-small text-graphite-soft">
              {strings.requirementsVary}
            </p>
          </section>
        )}

        {state.phase === 'analysing' && !state.replacing && (
          <section data-phase aria-live="polite" data-testid="processing">
            <h2 className="font-display text-heading m-0 text-ink">{strings.processingHeading}</h2>
            <ol className="m-0 mt-3 list-none p-0">
              <li className="flex items-center gap-3 py-2 text-body text-graphite">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal/50 motion-reduce:hidden" />
                  <span className="relative inline-flex size-3 rounded-full bg-teal" />
                </span>
                {strings.processingReading}
              </li>
              <li className="flex items-center gap-3 py-2 text-body text-graphite-soft">
                <span className="inline-flex size-3 rounded-full border border-line-strong" />
                {strings.processingRules}
              </li>
            </ol>
            <p className="mt-3 mb-0 text-small text-graphite-soft">{strings.processingHonest}</p>
          </section>
        )}

        {state.result &&
          (state.phase === 'result' || state.phase === 'deleting' || state.replacing) && (
            <section data-phase data-testid="result">
              {state.replacing && busy && (
                <p className="mb-4 text-small text-graphite-soft" role="status" aria-live="polite">
                  {state.phase === 'uploading' ? strings.uploading : strings.processingReading}…
                </p>
              )}
              <ResultSheet
                result={state.result}
                language={state.language}
                strings={strings}
                busy={busy}
                sampleMode={state.sampleMode}
                onReplace={(type, file) => void flow.replaceOne(type, file)}
                onUseCorrectedSample={() => void flow.replaceWithCorrectedSample()}
                onDelete={() => void flow.removeEverything()}
              />
              <p className="mt-2 mb-0 max-w-[62ch] text-small text-graphite-soft">
                {strings.requirementsVary}
              </p>
            </section>
          )}

        {state.phase === 'deleted' && (
          <section data-phase data-testid="deleted" className="mt-4">
            <h1 className="font-display m-0 text-display font-medium text-ink">
              {strings.deletedHeading}
            </h1>
            <p className="mt-3 max-w-[62ch] text-body text-graphite">{strings.deletedBody}</p>
            <button
              type="button"
              onClick={flow.startAgain}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-sm bg-teal px-6 py-3 text-body font-semibold text-paper-bright hover:bg-teal-deep active:bg-teal-deep"
            >
              {strings.startAgain}
              <Icon name="arrow" size={18} />
            </button>
          </section>
        )}
      </main>

      <footer className="hairline-t flex flex-wrap items-center justify-between gap-3 py-5 text-small text-graphite-soft">
        <span>{strings.team} · KagazReady</span>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="min-h-11 text-small text-graphite-soft underline underline-offset-4 hover:text-ink"
        >
          {strings.howItWorks}
        </button>
      </footer>

      <ArchitectureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        strings={strings}
      />
    </div>
  );
}

function LanguageSwitch({
  value,
  label,
  onChange,
}: {
  value: Language;
  label: string;
  onChange: (l: Language) => void;
}) {
  return (
    <div role="group" aria-label={label} className="hairline inline-flex rounded-sm p-0.5">
      {LANGUAGE_OPTIONS.map((option) => {
        const active = option.code === value;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => onChange(option.code)}
            className={`min-h-11 min-w-11 rounded-hair px-2.5 py-2 text-small transition-colors duration-(--duration-micro) ${
              active
                ? 'bg-ink text-paper-bright'
                : 'text-graphite hover:bg-paper-deep active:bg-paper-deep'
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
