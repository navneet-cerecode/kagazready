---
version: 1
slug: 'src-app-tsx'
primary_target: 'src/App.tsx'
related_targets: []
---

# Surface brief — KagazReady app (single route)

## Scope and mode

One route, mobile-first, mode **Operate**. The visitor completes one task: get three documents
checked and act on the findings. Persuasion is limited to the first viewport making the offer
intelligible and the sample journey one tap away.

## Audience, job, action, proof, constraints

- Student on a phone, documents already photographed, asking "will this get sent back?".
- Task: add up to three photos (or load the sample set), run the check, read findings, replace the
  problem document, re-check, delete.
- Proof: the masked evidence line each finding was read from, the rule id, and the deterministic
  origin. No statistics, no testimonials.
- Constraints from PRODUCT.md: three statuses only; forbidden words never appear; account numbers
  masked; disclaimers inline where read; en/hi/gu first-class; reduced motion honoured; one check
  at a time, then delete.

## Direction contract

THESIS: The document is the page, and every finding is a proofreader's mark in the margin, tied to
the exact line that was read. It refuses the category default — a status banner over a stack of
cards with the evidence folded inside each card — and it refuses the chatbot.

OWN-WORLD: Warm paper ground with ink-navy structure and graphite text; a true gutter column where
marks live; hairline rules instead of shadows; small radii; tabular numerals everywhere a value is
shown. Spectral for headings, Public Sans for interface text, Noto Sans Devanagari and Gujarati for
Hindi and Gujarati, a system monospace for masked values and rule ids. Amber is the mark for
"needs review", reserved red for "missing", muted teal for the single primary action. Colour is
reserved by law for status and the one action; nothing else is coloured.

STORY: The student sees their three documents laid out as a proof sheet, understands that each
mark points at a line that was genuinely read, believes it because the evidence is visible and
masked, and acts by replacing the marked document. When the sheet comes back clean, the marks are
gone — not replaced by a celebration.

FIRST VIEWPORT (mobile): a small typographic wordmark top-left, the language switch top-right. One
line of galley heading: "Check the paperwork before the portal checks you." Beneath it the proof
sheet: three ruled rows, numbered, one per document type, each with an "Add photo" affordance.
Under the sheet, the single teal primary action "Check these documents" (disabled until one
document exists) and a quiet text link "Try the sample set instead". A one-line "what this is not"
sits under the action, in the sheet's own voice, not in a footer. On desktop the sheet sits in a
readable measure with the gutter visible to its left.

FORM: Proofreader's galley — position 1 on the ordered grounded list, presented as IMPECCABLE'S PICK
against assigned candidate 4 (railway reservation chart) and chosen by the user. Seed key a98c47c1.
Raises taken from declined and competitive challengers: status colours reserved by law for status
alone (arcade); findings pinned to their evidence line (tensegrity); Delete isolated by deliberate
empty space (developer console); exactly one primary action visible per screen (hardware bench).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment

The mark leaving the margin: after the bank proof is replaced and re-checked, the amber marks
withdraw and the row is left clean with its status token reading "No issues found". Reduced
motion: the marks are simply gone.

## Unresolved

- Whether the architecture drawer ("how AWS powers this") opens from the header or from the result.
- Exact behaviour of the language switch after a result exists (re-fetch with `?language=`).
