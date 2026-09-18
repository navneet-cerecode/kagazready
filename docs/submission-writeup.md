# Submission write-up — KagazReady

**Team DiuDaman · WeMakeDevs × AWS "First Commit"**
**Live:** https://main.d109ovvm872kui.amplifyapp.com
**Tagline:** Check the paperwork before the portal checks you.

## The problem

Scholarship applications in India are returned for boring reasons: a required document missing,
a photograph too blurry to read, a name spelt differently on the bank passbook than on the
marksheet. The National Scholarship Portal's own guidance describes these failure classes; students
we spoke with confirmed the shape of it — phone photos, a deadline, and no way to know which mistake
matters until the application comes back weeks later.

## What KagazReady does

A student adds up to three photos — Class XII marksheet, income certificate, bank proof — and
presses one button. Amazon Textract reads the text; a deterministic rule engine checks for what is
**missing, unreadable, or inconsistent**; and the student gets a correction list in English, Hindi
or Gujarati, laid out like a proofreader's marks on the sheet they submitted. Each mark shows the
masked value that was read, the OCR confidence, why it matters, what to do, and the rule that
decided it. They replace the one document that needs it, check again, and delete everything.

It says one of three things: **Incomplete**, **Needs review**, **No issues found**. It never says
approved, eligible or verified, because it cannot know.

## How AWS is used

| Service              | Role                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| Amplify Hosting      | Static frontend with a strict CSP and security headers                         |
| API Gateway HTTP API | Five routes, CORS pinned to one origin, throttled                              |
| Lambda (arm64)       | Four functions, four least-privilege roles                                     |
| S3                   | Private uploads via presigned POST; Block Public Access; 1-day lifecycle       |
| Textract             | `DetectDocumentText`, one page per document                                    |
| Bedrock              | Rephrases an already-decided finding in plain words; never decides (see below) |
| DynamoDB             | Masked results with a 6-hour TTL; the daily cap counter                        |
| CloudWatch           | Redacted logs, 7-day retention                                                 |
| SAM                  | The whole stack in one template                                                |

## The design decision that matters

**Application code decides; the model explains.** The rule engine (`packages/rules`) is pure
TypeScript with 130 tests: Unicode-aware name comparison that preserves Devanagari and Gujarati
conjuncts, account masking, IFSC structure, Indian date parsing with ambiguity detection, and
per-field OCR-confidence thresholds. Bedrock is called after the status is final, receives only
masked findings, and its output is schema-validated with decision words rejected. Any Bedrock
failure falls back to reviewed English — a Bedrock failure is never an analysis failure.

That boundary was tested by circumstance: the hackathon AWS account's Bedrock quotas are zero (a
Support case is open), so the deployment runs with Bedrock off. The product is fully functional
and trilingual without it, and reports `explanationsDegraded: true` rather than pretending.

## Privacy by construction

The API never sees file bytes. OCR text lives in Lambda memory only. Bank account numbers are
masked before storage, logs, rendering or any prompt. Results expire in six hours, objects in a
day, and **Delete** removes both immediately. No accounts, no cookies, no analytics, no Aadhaar.

## Verification

Nothing is claimed that did not run: 209 unit and handler tests, 8 live Textract tests, 15
Playwright runs against the public URL (desktop, Pixel 7, reduced motion), a live smoke of the
full journey including deletion. `tests.json` is the ledger — 65 passing, 1 blocked (Bedrock
quota), 1 not run (Ponytail). `VERIFICATION.md` has the detail.

## Craft

The interface is one authored direction — a proofreader's galley on warm paper — chosen through an
Impeccable design-direction pass, then critiqued (29/40 → fixes shipped), audited (19/20), and
animation-reviewed against Emil Kowalski's standard. Hindi and Gujarati are first-class: their own
fonts, a 14px floor, `lang` on every translated span.

## Cost

USD 0.00 billed to date; all usage inside the free tier. Roughly USD 0.005 per complete demo
journey. A daily cap and API throttling make the worst case under USD 1 a day.

## Honest limitations

Bedrock off pending quota; Indic copy not native-reviewed; English document labels only; one
scholarship template; no thumbnail of the uploaded photo yet. `docs/limitations.md`.

## Built with

Claude Code (Claude Opus 5) as pair programmer, directed by the team; Impeccable and Emil Kowalski
skill collections for design and motion review. Disclosure in `README.md`, tools in
`ATTRIBUTIONS.md`. MIT licence.
