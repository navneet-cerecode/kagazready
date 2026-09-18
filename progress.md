# progress.md — KagazReady

Living state file. Update at every milestone so work can resume after context compaction or in a new
Claude Code session.

## Authorization record

- **2026-09-17** — Read-only audit completed and reported. No files created.
- **2026-09-17** — Clock authorization given by the user in chat, verbatim: _"the round is now live
  we can start building"_. Implementation authorized from this point. Separate approval is still
  required before creating or pushing a public GitHub repository, exceeding the AWS budget,
  force-pushing, or deleting unfamiliar infrastructure.

## Current milestone

**Phase 4 complete — the stack is deployed and live in ap-south-1.**

- API base URL: `https://qev138fuyk.execute-api.ap-south-1.amazonaws.com/prod`
- Stack: `kagazready`, region `ap-south-1`
- Bedrock: intentionally unconfigured (see blocker 1). Everything else is real.

**The application is live at a public URL and the whole demo journey works there.**

- Frontend: `https://main.d109ovvm872kui.amplifyapp.com` (Amplify Hosting, manual zip deployment,
  security headers from `apps/web/customHttp.yml`)
- API: `https://qev138fuyk.execute-api.ap-south-1.amazonaws.com/prod`, `AllowedOrigin` now pinned
  to the Amplify origin.
- Verified on the public URL on 2026-09-18: sample set → real upload → real Textract → Needs
  review with masked evidence → corrected bank proof → No issues found → delete.

- Playwright: 15/15 on the public URL (desktop, Pixel 7, reduced motion) — `1e322bb`; 18/18 after
  the audit fixes on 2026-09-18.
- Impeccable critique acted on and redeployed (Amplify job 3) — `e6bdbad`. Decision taken
  2026-09-18: keep the two-sheet structure (compose sheet → result sheet) rather than folding the
  result into the compose sheet; the rework is not worth the clock.

- Impeccable audit 19/20 and polish (`18aacc3`), animation review (`db0f4b4`), security review
  and `docs/threat-model.md` (`ba81f25`), the full documentation set with `DESIGN.md`
  (`a1824ea`), README screenshots (`b42a2bc`) — all done 2026-09-18.

- Deployed as Amplify job 4 on 2026-09-18 with the polish, motion and distill commits; live
  detector reports only `cream-palette` at both viewports; Playwright desktop 5/5.
- **Public repository created and pushed with the user's approval:**
  https://github.com/navneet-cerecode/kagazready (the AWS account id was found in one unpushed
  commit and removed by a local rebase before the first push; history is clean).

- **Read-only audit 2026-09-18 (afternoon), then fixes deployed** (stack update + Amplify job 5).
  Found live and fixed: the "How AWS powers this" drawer paired six service labels with five
  paragraphs (labels shifted by one); a `POST /analyses` whose upload was missing returned 500
  (the analyses role lacked `s3:ListBucket`, so S3 answered HeadObject with 403) and every retry
  of that id then answered 409 for the whole TTL (the `processing` item was never rolled back);
  keyboard focus was invisible on the Add/Replace photo controls (`has-[:focus-visible]` on a
  sibling input). Also: the reading state now replaces the sheet on phones instead of sitting two
  screens down; copy and docs corrected ("within a day" → "a day or two", the budget claim, the
  name-rule grammar); GSAP no longer warns on a clean sheet. Playwright 18/18 on the public URL
  after the redeploy; the retry path re-checked live with curl (400, 400, 404).

- Later on 2026-09-18 (stack update + Amplify job 6): an omitted middle name is now a minor
  difference; the sample IFSC is `SYNB0234567` (old value read at 89.5% vs the 88% threshold);
  both bank-proof samples regenerated and re-measured live; Playwright 18/18 on the public URL;
  the upload bucket emptied of stray synthetic runs through the app's own DELETE route.

Remaining: Ponytail review (plugin not installed); the AWS Budget (command in
`docs/cost-estimate.md`, needs the team's alert email); the demo video and submission form (team);
Bedrock smoke test if the quota case succeeds.

## AWS credits (checked in the Billing console 2026-09-18)

- **$120.00 active, $0.00 used**: a $100 "AWS Free Tier" credit (issued 2026-08-31, expires
  2027-08-31) and a $20 "Explore AWS: Create a web app using AWS Lambda" credit earned by the
  deployment on 2026-09-17.
- Every service KagazReady uses is on the credits' covered list: Textract, Bedrock, Lambda, API
  Gateway, DynamoDB, S3, Amplify, CloudWatch, CloudFormation.
- Free-tier usage so far: Textract 82 of 1,000 free pages, Lambda 7 requests, CloudWatch 0 GB.
  Nothing has been billed and nothing has drawn on the credits.
- Credits are therefore **not** the reason Bedrock is blocked (see blocker 1). The budget rules
  in `CLAUDE.md` (warn $10, urgent $18, boundary $23) stay in force regardless of the credits.

## Environment audit (2026-09-17)

| Item          | State                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Node          | v24.12.0                                                                             |
| npm           | 11.6.2                                                                               |
| Git           | 2.47.1.windows.1                                                                     |
| GitHub CLI    | 2.97.0, authenticated as `navneet-cerecode` (scopes: repo, workflow, gist, read:org) |
| Docker        | present (optional, for `sam local`)                                                  |
| Python        | 3.14.0                                                                               |
| AWS CLI       | **not installed** — blocker for Phase 4                                              |
| AWS SAM CLI   | **not installed** — blocker for Phase 4                                              |
| AWS creds     | **absent** — no `~/.aws`, no `AWS_*` env vars                                        |
| Ponytail      | **not installed** — no marketplaces registered                                       |
| Impeccable    | not installed                                                                        |
| Emil skills   | not installed                                                                        |
| Repo at start | directory completely empty, not a git repository, no remote                          |

No pre-existing or uncommitted user work existed in this directory. Nothing was overwritten.

## Completed work

- `git init -b main`, workspace directory structure created.
- `.gitignore` excluding `.env`, `.claude/settings.local.json`, Impeccable caches, generated
  fixtures, and any `private/` or `samples-real/` path.
- Root `package.json` (npm workspaces), `tsconfig.base.json`, Prettier config.
- `CLAUDE.md` — product purpose, architecture, the Bedrock-cannot-determine-status boundary, coding
  conventions, commands, region, security boundaries, cost limits, testing requirements.
- `progress.md`, `tests.json` seeded.
- Impeccable v4.1.0 installed project-locally (`.claude/skills/impeccable`, agents, and a hook in
  `.claude/settings.local.json`, which is gitignored). Emil Kowalski's skills installed into
  `.agents/skills` with symlinks in `.claude/skills`. Both are gitignored: they are absolute
  symlinks plus a 17 MB platform binary, and the install commands are recorded in
  `ATTRIBUTIONS.md`. **Ponytail is still missing** and must be installed by the user.
- `LICENSE` (MIT), `ATTRIBUTIONS.md`, `eslint.config.js`, Prettier config.

### Phase 3 — the whole backend, implemented and tested

- `packages/contracts` — zod schemas for the HTTP contract, the domain types, the Bedrock output
  schema (which rejects decision words outright), and the versioned scholarship template.
- `packages/rules` — the deterministic engine. Unicode-aware normalization, name comparison
  (match / minor / material), account masking, IFSC structure, Indian date parsing with ambiguity
  and future-date detection, OCR confidence thresholds, label-based field extraction from Textract
  lines, and reviewed copy in English, Hindi and Gujarati. Pure: a test asserts it imports no AWS
  SDK, reads no clock, and never logs.
- `services/api` — four Lambda handlers (`uploads`, `analyses` write, `analysis` read/delete,
  `health`) plus thin adapters for S3, Textract, DynamoDB and Bedrock, a daily cap enforced by a
  conditional DynamoDB counter, correlation IDs, and safe errors.
- `services/template.yaml` — SAM stack: private S3 with Block Public Access, SSE, a one-day
  lifecycle rule and a TLS-only bucket policy; DynamoDB with TTL; HTTP API with throttling and
  restrictive CORS; four functions with separate least-privilege roles; seven-day log retention.

### The Lambda build: three problems found and fixed while getting `sam build` to pass

1. SAM's default builder copies `CodeUri` to a scratch directory and runs `npm install` there, which
   404s on `@kagazready/contracts` — workspace symlinks are not published packages.
   `build_in_source = true` in `services/samconfig.toml` fixes the resolution.
2. SAM's esbuild builder then could not find esbuild, because npm workspaces hoist it to the root
   `node_modules/.bin` and the builder only looks inside the function's own. Putting it on PATH did
   not help. Resolved by bundling explicitly in `services/api/build.mjs` and letting SAM only zip
   the output — which also makes the Lambda build reproducible without SAM.
3. The bundles built but did not load: `services/api` is `"type": "module"`, so Node parsed the
   CommonJS output as ESM and the handler export vanished. Each `dist/<name>/package.json` now sets
   `"type": "commonjs"`, and `build.mjs` loads every bundle and asserts the handler export, so a
   bundle that builds but cannot run fails the build instead of failing in Lambda.

### Textract confidence is close to bimodal on synthetic text

Getting a genuine "unclear field" finding was the hardest part of the fixtures, and the first three
attempts were all wrong in an instructive way.

Blur plus low contrast does almost nothing to Textract's reported confidence. A heavily blurred,
pale account number was still read at **97.9%**, and past a certain point the line stopped being
detected at all — there was no usable middle band. Worse, when the line disappeared, a loose
"find the line with digits" helper silently matched the nine-digit **MICR** line instead and
reported a healthy confidence for entirely the wrong line.

What actually lowers confidence is glyph _ambiguity_, not faintness. Measured (see
`fixtures/out/calibration.txt`, threshold 88%):

| Quality                  | Value confidence | Outcome                      |
| ------------------------ | ---------------- | ---------------------------- |
| `clean`                  | 99.4%            | too clean                    |
| `pixelated-2x`           | 99.3%            | too clean                    |
| `pixelated-3x`           | 98.7%            | too clean                    |
| `pixelated-4x`           | not detected     | would report a missing field |
| `faint`                  | not detected     | would report a missing field |
| `pixelated-3x-scratched` | not detected     | would report a missing field |
| **`scratched`**          | **61.9%**        | **chosen**                   |

`scratched` also makes Textract misread one digit: `3049 8812 7745` comes back as
`3049 0812 7745`. That misread is the reason it is the right fixture rather than a defect in it — a
value OCR is unsure about _and got wrong_ is exactly what the confidence rule exists to catch. The
product never claims the value is correct; it says the field is hard to read and asks for a clearer
photo. The masked evidence shown to the user is the last four digits, which are read correctly, so
nothing incorrect is ever displayed.

The threshold was never moved to accommodate an image. The test asserts that if the last four
digits ever stop being read correctly, a different quality must be chosen — not a lower threshold.

### Two bugs that only a real deployment could find

Both were invisible to 176 passing local tests, and both are now pinned by regression tests.

1. **CloudFormation passes an unset parameter as an empty string, not as an absent variable.**
   `BEDROCK_MODEL_ID` was `z.string().min(1).optional()`, which accepts absent but rejects empty, so
   config parsing threw on every invocation of the two functions carrying that variable. Local tests
   passed because they _deleted_ the variable instead of setting it to empty. Optional environment
   variables now treat empty and absent as the same thing.

2. **The error path depended on the configuration it was reporting on.** `corsHeaders()` called
   `config()`, and it is on the error path, so when config threw the error handler threw too and API
   Gateway replaced our response with its own bare "Internal Server Error" — losing the status code,
   the error code and the correlation ID. `corsHeaders()` now tolerates a broken config and omits
   only the origin header.

### Design decisions worth remembering

- **Localization does not depend on Bedrock.** Titles, reasons and suggested actions are static
  reviewed copy in all three languages. Bedrock only adds one optional plain-language sentence per
  finding. A Bedrock outage costs that sentence and nothing else.
- **One finding per disagreeing group, not per pair of documents.** Names are clustered by "same
  name written differently"; the largest cluster is the reference. One wrong document therefore
  produces one clear finding rather than two overlapping ones.
- **An unclear field is not also compared.** A name Textract read below its confidence threshold is
  excluded from cross-document comparison, because claiming a mismatch on characters nobody could
  read would invent a second problem.
- **Replacement re-reads all three documents.** Caching OCR text would save two Textract pages but
  would mean storing the unmasked account number in DynamoDB. Two pages cost a fraction of a cent.
- **ZWNJ and ZWJ are not whitespace.** They control conjunct formation in Devanagari and Gujarati,
  so stripping them would silently rewrite a name. The linter caught this one.

## Verified behavior

Commands run on 2026-09-17, all from the repository root:

| Command                  | Result                                              |
| ------------------------ | --------------------------------------------------- |
| `npm run test`           | 222 passed (8 contracts, 130 rules, 63 API, 21 web) |
| `npm run typecheck`      | 0 errors across all workspaces                      |
| `npx eslint .`           | 0 errors                                            |
| `npx prettier --check .` | all files match                                     |
| Playwright (public URL)  | 18 passed (3 projects × 6)                          |

Last re-run 2026-09-18 after the audit fixes (stack update and Amplify job 5).

Verified by those tests, against mocked AWS clients:

- Scenario A produces exactly two findings — the material name difference on the bank proof and the
  unclear account number — and reaches `needs_review`.
- Replacing the bank proof reaches `no_issues_found` with no findings.
- The account number never appears unmasked in any response, reading, finding, or rendered text.
- Textract is not called when a key sits outside the analysis prefix, when an object is missing,
  when it is too large or the wrong type, when more than three documents are sent, or when the
  daily cap is reached.
- A repeated analysis request with the same ID does not call Textract again.
- Bedrock failure, non-JSON output, schema-invalid output, output containing a decision word, and
  output naming a finding that was never sent all leave the deterministic result intact and fall
  back to reviewed English copy.
- Deletion removes the uploads and the stored result, only under its own prefix, and the analysis
  returns 404 afterwards.
- No error response contains a bucket name, a table name, a region, an ARN, or a stack trace.

`tests.json` records 70 passing, 1 blocked (Bedrock quotas), and 2 not yet run (Ponytail; the AWS
Budget). Nothing is claimed
as passing that has not actually run.

## Tooling installed by Claude on 2026-09-17

- **AWS CLI v2.36.47** — `winget install --id Amazon.AWSCLI -e`, installed to
  `C:\Program Files\Amazon\AWSCLIV2ws.exe`. winget handled elevation despite the session not
  being an administrator.
- **AWS SAM CLI v1.166.2** — `winget install --id Amazon.SAM-CLI -e`, installed to
  `C:\Program Files\Amazon\AWSSAMCLIin\sam.cmd`.
- A first attempt installed SAM through `pip install --user aws-sam-cli`. It worked, but pinned
  `click 8.1.8` into the user's Python and broke `huggingface-hub`, which needs `click>=8.4.2`. That
  install was removed and click restored; `python -m pip check` now reports no broken requirements.
  **Do not use the pip route for SAM on this machine.**
- Note for future sessions: neither CLI is on PATH inside this harness's shells, because shell state
  does not persist between tool calls. Invoke them by full path, or refresh PATH from the machine and
  user environment first.

## Active blockers

1. **Bedrock: blocked by account-level zero quotas on a new AWS account.** Diagnosed 2026-09-18,
   in order:

   - `AccessDeniedException: account is being verified` — cleared after ~2 hours.
   - Then `ValidationException: Operation not allowed` for every model tried, including
     `apac.amazon.nova-lite-v1:0`.
   - The Bedrock console's Model access page is retired ("models are automatically enabled when
     first invoked"), so there is no console switch to flip.
   - `service-quotas list-service-quotas --service-code bedrock` shows **all 75 "requests per
     minute" quotas at 0** (AWS default for Nova Lite: 400/min), "model invocation max tokens per
     day" at 0 (default 5.76 billion), and "cross-region tokens per minute" at 0 (default 400,000).
     Only the last is adjustable through Service Quotas; the other two require an AWS Support
     limit-increase case, which AWS may decline for an account this new.

   The intended model remains `apac.amazon.nova-lite-v1:0` (cheapest with an available agreement;
   Anthropic agreements are NOT_AVAILABLE to this account). The stack is deployed with
   `BEDROCK_MODEL_ID` empty. **The fallback path is not a degraded demo: it is verified live** —
   deterministic findings, reviewed copy in en/hi/gu, reviewed English plain-language notes,
   `explanationsDegraded: true` reported honestly. Per the brief, "the exact access blocker and
   fallback are documented" is an accepted outcome. If the quota is raised before submission,
   redeploy with the model ID and run the en/hi/gu smoke test.

   **AWS Support case submitted 2026-09-18** (Service limit increase → General, Basic Support,
   ~24h response) requesting the three Nova Lite quotas be raised to AWS defaults. The user
   submitted it from the console after reviewing the filled form.

2. **Ponytail plugin is not installed.** The user has the two commands. Until it is present, its
   published principles are applied manually (no unnecessary features, reuse before writing, prefer
   platform capabilities, prefer installed dependencies, minimum maintainable implementation, never
   strip security/validation/accessibility/error-handling/data-loss protection). The real
   `/ponytail` review must still be run before completion.
3. ~~Commit author identity.~~ **Resolved 2026-09-18.** The user confirmed
   `navneet-cerecode <cerecode9@gmail.com>`, which matches the existing global config. Set
   repo-locally rather than relying on the global value, so this repository's authorship is
   explicit. No GitHub remote exists yet, and creating or pushing a public repository still needs
   separate approval.

## AWS resources created

All inside CloudFormation stack `kagazready` in `ap-south-1`, so `sam delete` removes the lot:
a private S3 upload bucket (BPA all four on, AES256, 1-day lifecycle, TLS-only policy), a
PAY_PER_REQUEST DynamoDB table with TTL on `expiresAt`, an HTTP API and stage throttled to
10 rps / 20 burst with CORS pinned to one origin, four arm64 Lambda functions with separate
least-privilege roles, and five CloudWatch log groups at 7-day retention.

Created **outside** the stack by `sam deploy --resolve-s3`: the `aws-sam-cli-managed-default`
stack and its artefact bucket. `sam delete` does not remove these — delete them separately.

Amplify Hosting app `kagazready` (id `d109ovvm872kui`, branch `main`, region ap-south-1), created
with `aws amplify create-app`. Redeploy with `python scripts/deploy-web.py` after
`npm run build -w @kagazready/web`.

## Cleanup required

1. `sam delete --stack-name kagazready --region ap-south-1`
2. Delete the `aws-sam-cli-managed-default` stack and empty its artefact bucket.
3. `aws amplify delete-app --app-id d109ovvm872kui --region ap-south-1`

Nothing bills continuously while idle: DynamoDB is on-demand, Lambda and API Gateway are
per-request, and S3 holds a few kilobytes that expire within a day.

## Known limitations

- JPEG and PNG only; no PDF support in the MVP.
- Single-page images only, max 5 MB each, max 3 documents per analysis.
- One configurable scholarship-readiness template. Requirements vary by scholarship and the UI must
  say so.
- Readiness review only. No eligibility evaluation, no authenticity checking, no submission.

## Hackathon requirements (from wemakedevs.org/aws/first-commit, read 2026-09-18)

- **Track: Ship It** (deployed on AWS with a URL). One submission is considered for Ship It,
  Build It and Best UI. Ship It scores architecture and cost decisions; Best UI scores design and
  usability.
- Judging criteria: idea and impact; built on AWS; **learning** (say what was learned — now a
  section in the write-up and README); execution (does it work); the **demo video**.
- Submission = public repository + YouTube demo video under three minutes (public or unlisted,
  must _show_ AWS) + short write-up (problem, build, where AWS fits, AI tools used). Submitted once
  per team on the hackathon's form before the Sunday 20 Sept deadline (exact hour "still being
  finalised" on the schedule page — check it).
- Repository history must match the event dates: first commit 2026-09-17, after kickoff. ✓
- Optional: a blog on AWS Builder Center linked in the submission (top-5 blog prize) —
  `docs/builder-center-blog.md` is the draft; the team publishes it.
- Each member needs a WeMakeDevs account and an AWS Builder Center profile with student
  verification; the team leader claims the USD 100 team credits via the form on the page.

## Next action

1. Team: record the three-minute video (`docs/demo-script.md` shot list), upload to YouTube,
   publish the Builder Center blog (`docs/builder-center-blog.md`), submit the form before the
   Sunday deadline. Add the video link to `docs/submission-writeup.md` and `README.md`.
2. Ponytail review once the user installs the plugin
   (`/plugin marketplace add DietrichGebert/ponytail`, `/plugin install ponytail@ponytail`).
3. If the support case raises the Bedrock quotas: redeploy with
   `BedrockModelId=apac.amazon.nova-lite-v1:0`, run the en/hi/gu smoke test, update
   `tests.json`, `docs/limitations.md`, `README.md`.
4. Every later push goes to `origin main` with plain `git push`; never force-push. Grep the
   tracked files for the AWS account id before each push; it must appear nowhere.
