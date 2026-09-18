# Design system

The normative record is [`apps/web/DESIGN.md`](../apps/web/DESIGN.md): machine-readable tokens in
its frontmatter, then colours, typography, layout, elevation, shapes, components and the do's and
don'ts, all derived from the shipped code rather than from intentions. This page is the short
version and the story of how the direction was chosen.

## The direction: "The Proofreader's Galley"

**Thesis.** The document is the page, and every finding is a proofreader's mark in the margin,
tied to the exact line that was read. It refuses the category default — a status banner over a
stack of cards with the evidence folded inside — and it refuses the chatbot.

**How it was chosen.** The Impeccable design-direction pass generated a grounded list of candidate
worlds for this product (seed key `a98c47c1`). "Proofreader's galley" ranked first and was presented
as Impeccable's pick against the assigned candidate, a railway reservation chart; the team chose
the galley. Ideas from the declined candidates were kept where they made the galley stronger:
status colours reserved by law for status alone; findings pinned to their evidence line; Delete
isolated by deliberate empty space; exactly one primary action per screen.

**The story it tells.** A student sees their three documents laid out as a proof sheet, understands
that each mark points at a line that was genuinely read, believes it because the evidence is
visible and masked, and acts by replacing the marked document. When the sheet comes back clean the
marks are gone — not replaced by a celebration.

## The system in five lines

1. **Palette.** Galley Paper `#f6f1e7` ground; Ink Navy `#0f1f3d` for structure; graphite for text.
   Three colours with meaning and nothing else coloured: Proof Teal `#1f6f78` for the one primary
   action, Margin Amber `#c47d12` for "needs review", Correction Red `#a3251a` for "missing" and
   for Delete.
2. **Type.** Spectral (500/600) for the wordmark, headings and status token; Public Sans for
   interface text; Noto Sans Devanagari and Noto Sans Gujarati swapped in by `html[lang]`; a
   system monospace for masked values and rule ids; tabular figures on every number. Nothing Indic
   below 14px.
3. **Layout.** One column, max 48rem, 16px gutters on phones and 32px from 640px. The sheet is
   ruled rows with a gutter column where numbers and marks live. 44px touch minimum; the primary
   action is 48px.
4. **Depth.** Flat. Hairline rules (navy at 14% and 32%) instead of shadows. The one lifted surface
   is the architecture drawer, a modal, which carries the only shadow token.
5. **Motion.** GSAP only; 120ms micro, 240ms state, up to 300ms for a sheet arriving; ease-out on
   everything that enters or leaves; every movement gated behind `prefers-reduced-motion:
no-preference`, with colour feedback kept for reduced-motion users.

## Named rules worth repeating

- **Reserved Colour.** Colour means status or the one action. A decorative use of teal, amber or
  red is a defect.
- **Never Colour Alone.** Every status is also stated in words, visibly and for screen readers.
- **Three Statuses.** Incomplete, Needs review, No issues found. Nothing else, in any language.
- **Hairline.** Separation is a rule, not a shadow and not a card.
- **Indic Floor.** Matras and nuktas need pixels: no Devanagari or Gujarati text under 14px.

## What the passes changed

- **Critique (heuristics 29/40, dual-agent).** The Incomplete result was a dead end; every mark now
  carries "Add photo" or "Replace photo" for its document. "Marks" became "What to fix". Status
  moved from colour-plus-glyph to words. `<html lang>` now follows the detected language. Plain
  words moved above Why / What to do.
- **Audit (19/20).** Explicit vertical padding on filled and bordered controls so a wrapped Gujarati
  label cannot sit on a border; a reading measure on the disclaimers and plain-words notes; the
  language buttons to 44px. The deterministic detector reports 0 findings on source.
- **Animation review.** An ease-in on the mark withdraw became ease-out; entrances trimmed to
  300ms; the upload progress bar moved from `width` to `scaleX`; the global reduced-motion kill
  switch replaced by targeted gating.

## Not done, on purpose

No dark mode (`color-scheme: light` is declared). No logo — the wordmark is typographic. No
illustration, no confetti, no gradient. No thumbnail of the uploaded photo on the result, yet; it
is the first improvement after the hackathon.
