# Attributions

## Development tools used to build KagazReady

These are **development tools**, not features of the product. None of them is redistributed in this
repository — they are excluded by `.gitignore` and installed on demand with the commands below.
Nothing from their documentation is reproduced as a product claim.

| Tool                                                         | Purpose                                                               | How it was installed                                                                            | Licence                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Ponytail** (`DietrichGebert/ponytail`)                     | Complexity review — keeps the implementation minimal and maintainable | `/plugin marketplace add …` + `/plugin install ponytail@ponytail` (Claude Code plugin commands) | Check the source repository; not shipped with a licence file              |
| **Impeccable** v4.1.0 (`impeccable` on npm, engine v0.1.5)   | Design direction, critique, audit, polish, distill passes             | `npx impeccable install --providers=claude --scope=project`                                     | Check the npm package / source repository; no licence file in the install |
| **Emil Kowalski's skill collection** (`emilkowalski/skills`) | Design-engineering and animation review skills                        | `npx skills@latest add emilkowalski/skills`                                                     | Check the source repository; no licence file in the install               |
| **Claude Code / Claude Opus 5**                              | AI pair programming across the whole build                            | Anthropic                                                                                       | Anthropic terms                                                           |

Note on licences: neither the Impeccable install nor the Emil Kowalski skill install placed a
licence file on disk, so the licence could not be recorded from the installed artefacts. Because
these tools are not redistributed here, this repository does not relicense or republish any part of
them. Anyone reusing them should confirm the terms at the upstream source.

Skills used from each collection, at the milestone each was relevant to — not mechanically:

- Impeccable: design direction before UI work, critique after the first complete interface, audit
  before final verification, polish after fixes, distill at the end.
- `emil-design-eng` for the interface pass; `find-animation-opportunities`, `animate`,
  `review-animations`, `improve-animations`, `animation-vocabulary` for the GSAP pass;
  `mobile-native` and `pick-ui-library` where mobile behaviour and component choices came up.

Unused skills from these collections (`apple-design`, `ask-sonner`, `write-swift`, `prototype`,
`animate-expo`) were not applicable to this project.

## Runtime dependencies

Declared in the workspace `package.json` files. Principal ones:

| Dependency                                | Licence                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| React, React DOM                          | MIT                                                                 |
| Vite                                      | MIT                                                                 |
| TypeScript                                | Apache-2.0                                                          |
| Tailwind CSS                              | MIT                                                                 |
| GSAP + `@gsap/react`                      | GSAP standard "no charge" licence — see https://gsap.com/licensing/ |
| Zod                                       | MIT                                                                 |
| AWS SDK for JavaScript v3                 | Apache-2.0                                                          |
| Vitest, React Testing Library, Playwright | MIT                                                                 |

GSAP note: this project uses only the free GSAP core and `@gsap/react`. No Club GSAP / bonus plugins
are used, so the standard no-charge licence applies.

## Fonts

Recorded in `docs/design-system.md` together with their licences. Only fonts whose licence permits
web embedding are used, including the Devanagari and Gujarati families needed for the Hindi and
Gujarati interfaces.

## Data and content

- All demo documents are **synthetic**, generated programmatically by `fixtures/`, and every one is
  stamped `SYNTHETIC DEMO DOCUMENT — NOT VALID`. Identities and numbers are fictional.
- No real person's documents, no real account numbers, no Aadhaar-like values, no government logos,
  no bank branding, no official seals.
- Document requirements were derived from publicly published official scholarship guidance; the
  sources and the last-reviewed date are recorded in the versioned template configuration.

## AI tool disclosure

This project was built with Claude Code (Claude Opus 5) as an AI pair programmer, under human
direction, in a hackathon context where AI-assisted development is permitted. The full disclosure is
in `README.md`.
