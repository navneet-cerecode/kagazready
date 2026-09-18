# Submission write-up — KagazReady

**Team DiuDaman · WeMakeDevs × AWS "First Commit" (Bharat Builds Tour, 17–20 Sept 2026)**
**Track:** Ship It — deployed on AWS with a public URL (serverless: Lambda + API Gateway; hosting:
Amplify; data: S3 + DynamoDB; plus Textract, Bedrock, CloudWatch, SAM). One submission is
considered for Ship It, Build It and Best UI; the interface was built for the Best UI bar too.
**Live:** https://main.d109ovvm872kui.amplifyapp.com
**Repository:** https://github.com/navneet-cerecode/kagazready
**Demo video:** _YouTube link — under three minutes, public or unlisted (to add at submission)._
**Blog (AWS Builder Center):** https://builder.aws.com/content/3JVSGeqFIuVHSRysXPRuzpuHtQ3/we-built-a-scholarship-paperwork-checker-in-four-days-textract-taught-us-the-most
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

Nothing is claimed that did not run: 222 unit and handler tests, 8 live Textract tests, 18
Playwright runs against the public URL (desktop, Pixel 7, reduced motion), a live smoke of the
full journey including deletion. `tests.json` is the ledger — 70 passing, 1 blocked (Bedrock
quota), 2 not run (Ponytail; the AWS Budget). `VERIFICATION.md` has the detail.

## Craft

The interface is one authored direction — a proofreader's galley on warm paper — chosen through an
Impeccable design-direction pass, then critiqued (29/40 → fixes shipped), audited (19/20), and
animation-reviewed against Emil Kowalski's standard. Hindi and Gujarati are first-class: their own
fonts, a 14px floor, `lang` on every translated span.

## Cost

USD 0.00 billed to date; all usage inside the free tier. Roughly USD 0.005 per complete demo
journey. A daily cap and API throttling make the worst case under USD 1 a day.

## What we learned

The four days left us knowing things we did not on Thursday, most of them found the hard way:

- **Textract confidence is nearly bimodal on printed text.** Blur and low contrast barely move it
  (a heavily blurred number still read at 97.9%); past a point the line vanishes entirely. Only
  glyph _ambiguity_ — a scratched digit — produced a genuine 62% reading. Calibrating a fixture
  against a real service taught us more about OCR than any documentation.
- **CloudFormation passes an unset parameter as an empty string.** Two of four Lambdas failed on
  every invocation in production while 176 local tests passed. Optional configuration must treat
  empty and absent as the same thing — and the error path must not depend on the configuration it
  is reporting on.
- **SAM's esbuild builder and npm workspaces do not mix.** Hoisted `esbuild` is invisible to it,
  and workspace symlinks 404 on the registry in its scratch directory. Bundling ourselves and
  letting SAM zip a directory was simpler and reproducible.
- **Presigned S3 POST policies are the right shape for document uploads:** the API never touches
  file bytes, and the policy pins key, type and size for the browser.
- **A brand-new AWS account can have every Bedrock quota at zero**, which is neither a credit
  nor a model-access problem. Designing the model as decoration on a decision already made meant
  that discovery cost us nothing but a support case.
- **A PowerShell zip is not a zip Amplify can serve** (backslash entry names). Python's `zipfile`
  was the fix, and now the deploy is a script anyone can run.

## Honest limitations

Bedrock off pending quota; Indic copy not native-reviewed; English document labels only; one
scholarship template; no thumbnail of the uploaded photo yet. `docs/limitations.md`.

## Built with (AI coding tools, as the rules ask)

Claude Code (Claude Opus 5) as pair programmer for the whole build, directed by the team;
Impeccable and Emil Kowalski skill collections (Claude Code skills) for design direction,
critique, audit and motion review. Everything else is listed with its licence in
`ATTRIBUTIONS.md`. The project's own code is MIT.
