---
name: KagazReady
description: Check the paperwork before the portal checks you.
colors:
  paper: '#f6f1e7'
  paper-bright: '#fbf8f1'
  paper-deep: '#ede6d6'
  ink: '#0f1f3d'
  graphite: '#2f3338'
  graphite-soft: '#5b6169'
  graphite-faint: '#8a9099'
  line: 'rgb(15 31 61 / 0.14)'
  line-strong: 'rgb(15 31 61 / 0.32)'
  teal: '#1f6f78'
  teal-deep: '#164f56'
  teal-tint: '#e2efef'
  amber: '#c47d12'
  amber-ink: '#7c4f05'
  amber-tint: '#f7ead3'
  red: '#a3251a'
  red-ink: '#7e1b12'
  red-tint: '#f4dfdb'
typography:
  display:
    fontFamily: 'Spectral, Noto Sans Devanagari, Noto Sans Gujarati, Georgia, serif'
    fontSize: '2rem'
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: 'normal'
  display-lg:
    fontFamily: 'Spectral, Noto Sans Devanagari, Noto Sans Gujarati, Georgia, serif'
    fontSize: '2.625rem'
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: 'normal'
  wordmark:
    fontFamily: 'Spectral, Noto Sans Devanagari, Noto Sans Gujarati, Georgia, serif'
    fontSize: '1.375rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  heading:
    fontFamily: 'Spectral, Noto Sans Devanagari, Noto Sans Gujarati, Georgia, serif'
    fontSize: '1.375rem'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 'normal'
  body:
    fontFamily: 'Public Sans Variable, Noto Sans Devanagari, Noto Sans Gujarati, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 'normal'
  small:
    fontFamily: 'Public Sans Variable, Noto Sans Devanagari, Noto Sans Gujarati, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'Public Sans Variable, Noto Sans Devanagari, Noto Sans Gujarati, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: 'normal'
  mono:
    fontFamily: 'ui-monospace, Cascadia Mono, SF Mono, Menlo, Consolas, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: 'tnum'
rounded:
  hair: '2px'
  sm: '4px'
  md: '6px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  '10': '40px'
  '14': '56px'
components:
  button-primary:
    backgroundColor: '{colors.teal}'
    textColor: '{colors.paper-bright}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '12px 24px'
    height: '48px'
  button-primary-hover:
    backgroundColor: '{colors.teal-deep}'
  button-primary-disabled:
    backgroundColor: '{colors.paper-deep}'
    textColor: '{colors.graphite-soft}'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '10px 12px'
    height: '44px'
  button-outline-hover:
    backgroundColor: '{colors.paper-deep}'
  button-link:
    backgroundColor: 'transparent'
    textColor: '{colors.graphite-soft}'
    typography: '{typography.small}'
    height: '44px'
  button-link-hover:
    textColor: '{colors.ink}'
  button-destructive:
    backgroundColor: 'transparent'
    textColor: '{colors.red-ink}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '10px 16px'
    height: '44px'
  button-destructive-hover:
    backgroundColor: '{colors.red-tint}'
  button-destructive-confirm:
    backgroundColor: '{colors.red}'
    textColor: '{colors.paper-bright}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '10px 16px'
    height: '44px'
  button-destructive-confirm-hover:
    backgroundColor: '{colors.red-ink}'
  status-token-needs-review:
    backgroundColor: '{colors.amber-tint}'
    textColor: '{colors.amber-ink}'
    typography: '{typography.heading}'
    rounded: '{rounded.sm}'
    padding: '6px 12px'
  status-token-incomplete:
    backgroundColor: '{colors.red-tint}'
    textColor: '{colors.red-ink}'
    typography: '{typography.heading}'
    rounded: '{rounded.sm}'
    padding: '6px 12px'
  status-token-no-issues:
    backgroundColor: '{colors.paper-bright}'
    textColor: '{colors.ink}'
    typography: '{typography.heading}'
    rounded: '{rounded.sm}'
    padding: '6px 12px'
  language-segment:
    backgroundColor: 'transparent'
    textColor: '{colors.graphite}'
    typography: '{typography.small}'
    rounded: '{rounded.hair}'
    padding: '8px 10px'
    height: '44px'
  language-segment-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper-bright}'
  note-panel:
    backgroundColor: '{colors.paper-bright}'
    textColor: '{colors.graphite}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
  alert-error:
    backgroundColor: '{colors.paper-bright}'
    textColor: '{colors.red-ink}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '12px 16px'
---

# Design System: KagazReady

## Overview

**Creative North Star: "The Proofreader's Galley"**

The document is the page. KagazReady lays a student's three scholarship documents out as one ruled
proof sheet, and every finding is a proofreader's mark in the margin, pinned to the exact masked
line that was read. The whole surface is a warm paper sheet with ink-navy structure and graphite
text; the only things that carry colour are the marks themselves (amber for needs review, red for
missing) and the single primary action (teal). Nothing decorates. Depth is drawn with hairline
rules, not shadows. Numbers are data, so every number sits in tabular figures.

The system is precise and unhurried. One column, one readable measure, one primary action per
screen, and copy that states what was found and what to do, then stops. Hindi and Gujarati are
first-class: the interface switches to Noto Sans Devanagari or Gujarati at the `<html lang>`
boundary and never sets Indic text below 14px. Motion is transform-and-opacity only, and under
`prefers-reduced-motion` the sheet is simply, immediately complete.

Confirmed rejections: a status banner over a stack of cards with the evidence folded inside each
card; a chatbot; a celebration when the sheet comes back clean (the marks are gone, and that is
the whole event); dark mode (`color-scheme: light` is deliberate).

**Key Characteristics:**

- Warm paper ground, ink-navy structure, graphite text; a light-only page.
- A true gutter column: row numbers and proof marks live to the left of the text, never inside a card.
- Hairline rules (1px, navy at 14% alpha) separate everything; borders, not shadows, define surfaces.
- Colour reserved by law: amber and red for status, teal for the one action, nothing else.
- Small radii (2, 4, 6px); nothing pill-shaped.
- Spectral for headings and the wordmark, Public Sans for interface text, a system monospace for
  masked values and rule ids, tabular numerals wherever a value is shown.
- Every interactive element is at least 44px tall; the primary action is 48px.

## Colors

A warm paper field with one structural navy, three greys, and exactly three chromatic roles, each
of which has a solid, an "ink" for text, and a tint for fills.

### Primary

- **Proof Teal** (`teal`): the single primary action on any screen: "Check these documents", "Use
  the corrected sample", "Start again". Also the focus ring (2px outline, 2px offset), `accent-color`,
  link colour, and the upload progress bar. Its rarity is what makes it findable.
- **Deep Proof Teal** (`teal-deep`): the hover and active fill of the primary button; the hover
  colour of teal text links.
- **Teal Wash** (`teal-tint`): text selection background only.

### Secondary (status: needs review)

- **Margin Amber** (`amber`): the gutter stroke and icon of a "needs review" mark, and the border of
  the needs-review status token.
- **Amber Ink** (`amber-ink`): amber text; the status token label and the "Needs review" word on a mark.
- **Amber Tint** (`amber-tint`): the needs-review status token fill.

### Tertiary (status: missing, and the destructive action)

- **Correction Red** (`red`): the gutter stroke and icon of a "missing" mark, the border of the
  incomplete status token, the border of the Delete button, and the fill of its confirmation.
- **Red Ink** (`red-ink`): red text: the incomplete status token label, inline upload problems, the
  error alert message, Delete button text, and the hover of the "Remove" link on a sheet row.
- **Red Tint** (`red-tint`): the incomplete status token fill and the Delete button hover.

### Neutral

- **Galley Paper** (`paper`): the page and the architecture drawer panel. The body carries two very
  soft radial fields (white at 55% top-left, navy at 4% bottom-right) as paper grain; it never reads
  as a gradient.
- **Fresh Sheet** (`paper-bright`): a lighter panel on the paper: the plain-words note inside a mark,
  the error alert, the "No issues found" status token fill, and the text on any filled dark button.
- **Handled Paper** (`paper-deep`): pressed and hover fills for outline and segment controls, the
  progress-bar track, and the disabled primary button fill.
- **Ink Navy** (`ink`): headings, the wordmark, document titles, the active language segment fill,
  the "No issues found" token border and text, and the dialog backdrop at 40%.
- **Graphite** (`graphite`): body text, reasons, actions, evidence values.
- **Soft Graphite** (`graphite-soft`): secondary text: gutter row numbers, hints, field labels,
  footer, disclaimers, OCR confidence, quiet links.
- **Faint Graphite** (`graphite-faint`): the gutter numerals inside the architecture drawer only.
- **Hairline** (`line`): every rule and border: row separators, the sheet's top and bottom rules,
  the language switch frame, the error alert frame.
- **Strong Hairline** (`line-strong`): borders that must read as a control: the outline
  "Add photo" control, the disabled primary button, the empty processing dot, the neutral gutter
  stroke, and the scrollbar thumb.

### Named Rules

**The Reserved Colour Rule.** Colour appears on a page for exactly two reasons: to state a status
(amber = needs review, red = missing or destructive) or to point at the one primary action (teal).
Anything else on the page is paper, ink, graphite or a hairline. A coloured heading, a coloured
icon that is not a status icon, or a second teal control on the same screen is a defect.

**The Never-Colour-Alone Rule.** Status is always carried by a word and an icon as well as a colour.
The status token and every mark say "Needs review" or "Incomplete" in text; the gutter stroke and
the caret-and-bar or circle-cross icon accompany the word, never replace it.

**The Three Statuses Rule.** The only overall statuses are Incomplete, Needs review and No issues
found. The words Approved, Eligible, Verified, Guaranteed and Rejected never appear in copy, code,
tests or docs; nothing in the palette exists to express them.

## Typography

**Display Font:** Spectral 500/600 (with Noto Sans Devanagari, Noto Sans Gujarati, Georgia, serif)
**Body Font:** Public Sans Variable (with Noto Sans Devanagari, Noto Sans Gujarati, system-ui, sans-serif)
**Label/Mono Font:** ui-monospace stack (Cascadia Mono, SF Mono, Menlo, Consolas) for masked
values, rule ids and correlation ids

**Character:** A serif with ink in it over a plain, legible sans. Spectral gives the headings and
the wordmark the weight of a printed galley; Public Sans keeps every instruction quiet and clear.
All faces are self-hosted (`@fontsource`); no font request leaves the page. Under
`html[lang='hi']` and `html[lang='gu']` the sans and the display class both lead with the Indic
face, so conjuncts and matras render correctly and headings do not fall back to a Latin serif.

### Hierarchy

- **Display** (500, 2rem, 1.15; 2.625rem / 1.1 from the `sm` breakpoint): the one galley heading
  per screen ("Check the paperwork before the portal checks you", "Deleted"), measure capped at 22ch,
  `text-wrap: balance`.
- **Wordmark** (600, 1.375rem, tracking -0.01em): "KagazReady" top-left. Typographic only; there is
  no logo and none is to be invented.
- **Heading** (500, 1.375rem, 1.25): document titles in the sheet, mark titles, section headings,
  the status token, and the large gutter numerals. Set in Spectral; only the 500 and 600 cuts are
  loaded, so an unweighted heading renders at 500.
- **Body** (400, 1rem, 1.55): the intro, status summary, processing steps, primary button label.
  Reading measure capped at 62ch.
- **Small** (400, 0.875rem, 1.5): the working size of the interface: evidence, reasons, actions,
  hints, disclaimers, secondary buttons, footer. Semibold (600) for field-group titles in readings.
- **Label** (600, 0.8125rem, 1.45): block labels above content ("Reason", "Suggested action",
  "Plain words"), evidence captions, OCR confidence, rule-id lines, expiry line. Under Hindi or
  Gujarati this size is raised to 0.875rem.
- **Mono** (0.875rem, tabular): masked evidence values, extracted field values, rule ids in
  `<code>`, correlation ids.

### Named Rules

**The Tabular Figures Rule.** Every number on the page is data: gutter numbers, file sizes, upload
percentage, finding counts, confidence percentages, timestamps. All of them are set with
`font-variant-numeric: tabular-nums` (the `.tabular` utility, `code`, `kbd`, `.font-mono`).

**The Indic Floor Rule.** No Hindi or Gujarati text below 14px. The 13px label size is promoted to
0.875rem whenever `<html lang>` is `hi` or `gu`.

**The No Kicker Rule.** Headings stand on their own. There are no eyebrows, no uppercase tracked
kickers and no letter-spaced labels; the only tracking on the page is the wordmark's -0.01em.

## Layout

One column, mobile first. The page is a flex column at `min-height: 100dvh` with a maximum width
of 48rem (`max-w-3xl`), centred, with 16px horizontal padding on phones and 32px from the `sm`
breakpoint (640px). Header, main and footer stack vertically; the footer is a hairline-topped bar
that sits at the bottom of short pages.

The sheet is the spatial model: a list with a top and bottom rule (`rule-y`) whose rows are
separated by hairlines (`hairline-b`, last row unruled). Each row is a two-column grid with a
gutter of 2.25rem on phones and 3rem from `sm`, and 16px / 20px of vertical padding. The gutter
holds the row number in the sheet and the mark stroke in the result; text never sits in the gutter.
On phones a finding mark indents its text 20px from the stroke, 28px from `sm`.

Vertical rhythm is built on the Tailwind 4px scale, used in a small set of steps: 8px inside a
row (label to value), 12px between a mark's parts (evidence, note, reason, control), 16px around
a paragraph, 24px between the sheet and its action, 32px between the intro and the sheet and
above the disclaimer rule, 40px above the readings disclosure, and 56px of deliberate empty space
above the Delete section so nothing sits beside it.

Responsive changes are few: the display heading grows one step, the primary "Use the corrected
sample" button goes from full width to auto, the readings grid goes from one to three columns,
reason and action sit side by side, the "How AWS powers this" link appears in the header (on phones
it lives only in the footer), and the architecture drawer changes from a full-height bottom sheet
to a centred 36rem dialog.

## Elevation & Depth

The system is flat. Surfaces are separated by hairline rules, by a step between the three paper
values (paper, paper-bright, paper-deep), and by deliberate empty space. No shadow appears on the
page itself: not on buttons, not on the status token, not on the note panel, not on the sheet.

The single exception is the architecture drawer, which is a modal `<dialog>` lifted off the page
over a 40% ink backdrop. It carries the one shadow token, `--shadow-drawer`
(`0 18px 40px -18px rgb(15 31 61 / 0.45), 0 2px 6px -2px rgb(15 31 61 / 0.2)`), a soft navy
umbra rather than a black drop. The direction contract asked for no shadows anywhere; the build
made the modal the one elevated surface, and the token sheet says so in its own comment. This
record follows the build.

### Named Rules

**The Hairline Rule.** Depth on the page is drawn with 1px lines at navy 14% alpha, never with a
shadow, never with a filled card. A surface that needs to be distinguished gets a hairline or the
next paper value; it does not get a box-shadow.

**The One Lifted Surface Rule.** Only a modal dialog over a backdrop may carry `--shadow-drawer`.
Nothing that lives in the flow of the page is lifted.

## Shapes

Small radii throughout: 2px (`hair`) on the language-switch segments, focus outlines, the
progress bar and the mark stroke; 4px (`sm`) on every button, the status token, the note panel,
the error alert and the language-switch frame; 6px (`md`) on the drawer panel (top corners only
when it is a bottom sheet). Nothing is pill-shaped and nothing is a hard square.

Borders are 1px hairlines. Controls that must read as controls (the outline "Add photo" label, the
disabled primary button) use the strong hairline; separators use the faint one. The status token
uses a 1px border in its own status colour. The proof mark is a 3px-wide, 1.25rem-tall stroke with
2px radius, absolutely positioned at the left edge of the finding, 1.55rem from the top so it sits
beside the title line and not the whole entry; a full-height coloured bar would turn the entry into
a card with a side-tab, which is precisely not this world.

Icons are a single authored set of ten strokes (plus, check, mark, missing, trash, chevron, close,
arrow, photo, refresh) at 1.75 stroke weight, round caps and joins, 16 to 20px, in `currentColor`.
The "mark" glyph is a proofreader's caret-and-bar; "missing" is a circle-cross.

## Components

Every component is precise and unhurried: hairline-bordered or filled with one of the reserved
colours, 4px corners, 44px minimum touch height, colour transitions of 120ms and nothing else
animated on hover.

### Buttons

- **Shape:** slightly softened corners (4px), inline-flex, 8px icon gap.
- **Primary:** Proof Teal fill, Fresh Sheet text, body size semibold, 24px horizontal and 12px
  vertical padding, 48px minimum height; a trailing arrow icon at 18px. One per screen.
- **Hover / Focus:** fill deepens to Deep Proof Teal over 120ms; focus is the global 2px teal
  outline offset 2px. Disabled: Handled Paper fill, strong hairline border, Soft Graphite text,
  `not-allowed` cursor.
- **Outline (document control):** transparent, strong hairline border, Ink Navy text, small size,
  12px horizontal and 10px vertical padding, 44px minimum height, leading plus or refresh icon at
  16px. Hover and active fill Handled Paper. It is a `<label>` for a visually hidden file input;
  focus is drawn with `has-[:focus-visible]:ring-focus`.
- **Link:** small size, Soft Graphite, underlined with 4px offset, 44px minimum height; hover
  Ink Navy. Teal variant for the quiet "Try the sample set instead" link (hover Deep Proof Teal).
- **Destructive:** transparent with a Correction Red border, Red Ink text, small semibold,
  16px / 10px padding, leading trash icon; hover Red Tint. A first press swaps it for a filled
  Correction Red confirmation (Fresh Sheet text, hover Red Ink) beside a plain "Cancel" link.

### Chips

- **Style (status token):** an inline heading-size Spectral label with a 20px status icon, 1px
  border in the status colour, tinted fill, 12px / 6px padding, 4px corners. `role="status"`.
- **State:** needs review = Margin Amber border, Amber Tint fill, Amber Ink text; incomplete =
  Correction Red border, Red Tint fill, Red Ink text; no issues found = Ink Navy border and text on
  Fresh Sheet. There is no fourth state.

### Cards / Containers

- **Corner Style:** 4px on the note panel and error alert; 6px on the drawer.
- **Background:** the note panel ("Plain words") and the error alert use Fresh Sheet on Galley
  Paper; the drawer panel is Galley Paper.
- **Shadow Strategy:** none in the page flow (see Elevation & Depth); the drawer alone carries
  `--shadow-drawer`.
- **Border:** the error alert is hairline-framed; the note panel has no border, only the paper step.
- **Internal Padding:** note panel 12px / 8px; error alert 16px / 12px; drawer header 20px (24px
  from `sm`) horizontal, 16px vertical, hairline below.

### Inputs / Fields

- **Style:** file inputs are visually hidden (`sr-only`) behind the outline label control; there
  are no text fields. Native controls inherit font and colour, and `accent-color` is Proof Teal.
- **Focus:** the global `:focus-visible` outline (2px Proof Teal, 2px offset, 2px radius), or
  `ring-focus` on the label when the hidden input is focused.
- **Error / Disabled:** an upload problem is a small Red Ink paragraph under the row with
  `role="alert"`; disabled controls drop to 50% opacity and lose pointer events.

### Navigation

- **Header:** wordmark left, a 16px gap on phones (32px from `sm`) to the right cluster: the
  "How AWS powers this" link (hidden below `sm`) and the language switch.
- **Language switch:** a hairline-framed group (4px corners, 2px inner padding) of three
  `aria-pressed` segments, 44px square minimum, 2px corners, small size, 10px / 8px padding.
  Inactive: Graphite text, hover Handled Paper. Active: Ink Navy fill, Fresh Sheet text. Each
  segment carries its own `lang`.
- **Footer:** hairline-topped, small Soft Graphite text, team name left and the drawer link right.

### Proof Sheet Row (signature)

A numbered, ruled row: a Spectral heading-size numeral in Soft Graphite sits in the gutter; the
document title (heading, Ink Navy) and an optional "Remove" link share the first line; the second
line holds the file hint or the file name with a photo/check icon and a tabular size in kB, plus
the outline "Add photo" / "Replace photo" control. While uploading, a 4px Handled Paper track with
a Proof Teal bar and a tabular percentage replaces the control (real XHR progress, never invented).

### Finding Mark (signature)

A finding is a margin mark, not a card. A 3px status stroke sits in the gutter beside the title
line. The title (heading, Ink Navy) opens with the status icon in the status colour; the status
word and document name follow in Soft Graphite with the word itself in the status ink. Below:
the masked evidence in monospace with its OCR confidence, the "Plain words" note on a Fresh Sheet
panel, then Reason and Suggested action side by side from `sm`, then the outline
"Replace photo: <document>" control pinned to the mark with the rule id in `<code>` beside it.
Hairline below; no border around; nothing coloured except the stroke, the icon and the status word.

### Architecture Drawer

A native `<dialog>` with a 40% Ink Navy backdrop: full-height bottom sheet on phones with 6px top
corners, a centred 36rem panel from `sm`. Galley Paper panel, hairline-ruled header with a 44px
close control, numbered hairline-topped steps with Faint Graphite gutter numerals. The one surface
that carries a shadow.

### Motion

GSAP via `useGSAP`, transforms and opacity only, inside `gsap.matchMedia('(prefers-reduced-motion:
no-preference)')` so reduced-motion users get the finished state at once. Durations are the three
tokens: 120ms micro (colour changes on hover), 240ms state (the marks withdrawing 14px into the
margin before a re-checked result replaces them), 420ms sequence (upper bound; phase handoffs rise
10px over 380ms, marks enter from the left over 400ms with a 70ms stagger). Easing is
`--ease-out` for entrances and `--ease-in` for the withdraw. Serious status messages never bounce.

## Do's and Don'ts

### Do:

- **Do** keep one teal control per screen; if a second primary appears, one of them is wrong.
- **Do** draw every separation with a 1px hairline (`line`) or a step between the three paper
  values; use `line-strong` only where something must read as a control.
- **Do** set every number in tabular figures and every masked value or rule id in the mono stack.
- **Do** put the mark in the gutter beside the title line (3px by 1.25rem, 1.55rem from the top),
  and pin the finding's remedy control inside the same entry as its evidence.
- **Do** carry status as word + icon + colour, using exactly Incomplete, Needs review, No issues found.
- **Do** keep touch targets at 44px minimum and the primary action at 48px; cap reading measure
  at 62ch and the display heading at 22ch.
- **Do** switch to Noto Sans Devanagari or Gujarati at `<html lang>` and keep Indic text at 14px
  or above.
- **Do** wrap every GSAP tween in a reduced-motion match and animate transforms and opacity only.

### Don't:

- **Don't** use the words Approved, Eligible, Verified, Guaranteed or Rejected anywhere.
- **Don't** put a shadow on anything in the page flow; only the modal drawer carries `--shadow-drawer`.
- **Don't** colour anything that is not a status or the primary action: no coloured headings,
  no tinted section backgrounds, no decorative icons in teal.
- **Don't** turn a finding or a document row into a card with a full-height coloured side bar.
- **Don't** stack a status banner over a pile of cards, add a chat surface, or celebrate a clean
  sheet; the marks are simply gone.
- **Don't** add kickers, eyebrows, uppercase tracked labels, a logo, or a system display face;
  the wordmark is Spectral text and nothing more.
- **Don't** show fake progress percentages, use elastic or bouncing easing on status, or hide
  information behind an animation.
- **Don't** introduce dark mode; `color-scheme: light` and the paper ground are deliberate.
- **Don't** use a radius larger than 6px or a pill shape anywhere.
