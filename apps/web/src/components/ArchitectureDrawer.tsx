import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import type { UiStrings } from '../i18n/ui.js';
import { Icon } from './Icon.js';

/**
 * "How AWS powers this" — a native dialog, so focus trapping, Escape and the backdrop come from the
 * browser. GSAP only moves the panel in and out; with reduced motion it simply appears.
 */
interface ArchitectureDrawerProps {
  open: boolean;
  onClose: () => void;
  strings: UiStrings;
}

export function ArchitectureDrawer({ open, onClose, strings }: ArchitectureDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useGSAP(
    () => {
      if (!open || !panel.current) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(panel.current, { y: 28, opacity: 0, duration: 0.36, ease: 'power3.out' });
        gsap.from('[data-step]', {
          y: 8,
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          delay: 0.12,
          ease: 'power2.out',
          clearProps: 'all',
        });
      });
      return () => mm.revert();
    },
    { dependencies: [open], scope: panel },
  );

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop, not the panel, closes it.
        if (event.target === dialog.current) onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 backdrop:bg-ink/40 sm:mx-auto sm:my-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-xl"
      aria-labelledby="arch-heading"
    >
      <div
        ref={panel}
        className="flex h-full flex-col rounded-t-md bg-paper shadow-drawer sm:h-auto sm:rounded-md"
      >
        <div className="hairline-b flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 id="arch-heading" className="font-display text-heading m-0 text-ink">
            {strings.howItWorks}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-sm text-graphite-soft hover:bg-paper-deep active:bg-paper-deep"
            aria-label={strings.howItWorksClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mt-0 text-body text-graphite">{strings.archIntro}</p>

          <ol className="m-0 mt-4 list-none p-0">
            {strings.archSteps.map((step, index) => (
              <li
                key={strings.archServices[index]}
                data-step
                className="hairline-t grid grid-cols-[2rem_1fr] gap-x-3 py-3"
              >
                <span
                  className="tabular font-display text-heading text-graphite-faint"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="m-0 text-small font-semibold text-ink">
                    {strings.archServices[index]}
                  </p>
                  <p className="mt-1 mb-0 text-small text-graphite">{step}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="hairline-t mt-4 mb-0 pt-4 text-small text-graphite-soft">
            {strings.archBoundary}
          </p>
        </div>
      </div>
    </dialog>
  );
}
