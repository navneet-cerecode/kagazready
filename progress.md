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

Next code work is the fixtures generator, then the real Textract end-to-end run, then the frontend.

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

| Command                  | Result                                   |
| ------------------------ | ---------------------------------------- |
| `npm run test`           | 176 passed (130 rules, 46 API), 0 failed |
| `npm run typecheck`      | 0 errors across all three workspaces     |
| `npx eslint .`           | 0 errors                                 |
| `npx prettier --check .` | all files match                          |

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

`tests.json` records 34 passing, 6 blocked on AWS tooling, and 20 not yet run. Nothing is claimed
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

1. **Bedrock is blocked by AWS account verification, not by model access.**
   `anthropic.claude-3-haiku-20240307-v1:0` is confirmed available on-demand in `ap-south-1` via
   `aws bedrock list-foundation-models`, and it is the intended model. A real `Converse` call
   returns: `AccessDeniedException: Your account is currently being verified. Verification normally
takes less than 2 hours.`

   Amazon Nova is not offered on-demand in `ap-south-1`; the Anthropic options there are Claude 3
   Haiku and Claude 3 Sonnet, and Haiku is the cheaper.

   The stack is deployed with `BEDROCK_MODEL_ID` empty, which is a supported configuration: no
   Bedrock call is made, the deterministic analysis is unaffected, and explanations use reviewed
   English fallback copy with `explanationsDegraded: true`. **Textract is not affected** — it was
   probed on the live account and returned results. To finish: wait for verification, redeploy with
   the model ID, run the Bedrock smoke test.

2. **Ponytail plugin is not installed.** The user has the two commands. Until it is present, its
   published principles are applied manually (no unnecessary features, reuse before writing, prefer
   platform capabilities, prefer installed dependencies, minimum maintainable implementation, never
   strip security/validation/accessibility/error-handling/data-loss protection). The real
   `/ponytail` review must still be run before completion.
3. **Bedrock model access.** Requires a console action by the user — model access is granted per
   account and region, and Anthropic models additionally require accepting an end-user licence,
   which Claude must not accept on the user's behalf. Once credentials exist, the model ID will be
   verified with `aws bedrock list-foundation-models --region ap-south-1` rather than from the docs:
   the per-region list has moved out of the AWS documentation pages, so the API is now the
   authoritative source. `BEDROCK_MODEL_ID` has no default; an empty value is a supported
   configuration in which the analysis works and explanations use reviewed English fallback copy.
4. ~~Commit author identity.~~ **Resolved 2026-09-18.** The user confirmed
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

## Cleanup required

1. `sam delete --stack-name kagazready --region ap-south-1`
2. Delete the `aws-sam-cli-managed-default` stack and empty its artefact bucket.
3. Delete the Amplify app once it exists.

Nothing bills continuously while idle: DynamoDB is on-demand, Lambda and API Gateway are
per-request, and S3 holds a few kilobytes that expire within a day.

## Known limitations

- JPEG and PNG only; no PDF support in the MVP.
- Single-page images only, max 5 MB each, max 3 documents per analysis.
- One configurable scholarship-readiness template. Requirements vary by scholarship and the UI must
  say so.
- Readiness review only. No eligibility evaluation, no authenticity checking, no submission.

## Next action

1. `fixtures/` — generate the synthetic document images programmatically, with the account-number
   band deliberately degraded so real Textract returns low confidence rather than the threshold
   being tuned to fit.
2. `apps/web` — the frontend, starting with an Impeccable design direction pass.
3. Amplify Hosting, then update the stack's `AllowedOrigin` from `http://localhost:5173` to the
   deployed frontend origin. The API URL does not change.
4. When account verification completes: redeploy with
   `BedrockModelId=anthropic.claude-3-haiku-20240307-v1:0` and run the Bedrock smoke test.
