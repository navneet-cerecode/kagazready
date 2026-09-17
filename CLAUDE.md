# CLAUDE.md — KagazReady

Working instructions for any Claude Code session in this repository.
Read this and `progress.md` before making changes.

## 1. Product purpose

KagazReady helps Indian students review scholarship documents for missing, unreadable, or
inconsistent information **before** final submission. A user uploads a Class XII marksheet, an
income certificate, and a bank proof. AWS extracts the text, deterministic rules identify potential
problems, and the product returns an evidence-backed correction checklist in English, Hindi, or
Gujarati.

KagazReady is a **document-readiness assistant**.

It is **not** a government service, not affiliated with the National Scholarship Portal, not an
eligibility evaluator, not a document-authenticity service, not an automatic application submitter,
not a guarantee of approval, and not a general chatbot.

### Language rules that are not negotiable

Never emit, in code, copy, tests, or docs, any of: **Approved, Eligible, Verified, Guaranteed,
Rejected**. The only three overall statuses are:

- `incomplete`
- `needs_review`
- `no_issues_found`

Do not claim the team personally experienced scholarship rejection. The problem is presented as
identified through official guidance and student validation.

## 2. Architecture

```
Browser (React + Vite + TS + Tailwind + GSAP)
  -> POST /uploads        presigned S3 POST (randomized key, short expiry, MIME + size limits)
  -> POST to S3           private bucket, Block Public Access, SSE
  -> POST /analyses       Lambda: verify object -> Textract DetectDocumentText
                                 -> deterministic rules -> mask -> Bedrock explanation
                                 -> DynamoDB (TTL)
  -> GET  /analyses/{id}  read result
  -> PUT  /analyses/{id}/documents/{documentType}  replace one document, re-run
  -> DELETE /analyses/{id}  immediate deletion of result + S3 objects
```

Workspace layout:

| Path                     | Contains                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `packages/contracts`     | Zod schemas, shared types, versioned scholarship template config      |
| `packages/rules`         | Deterministic rule engine. Pure. No AWS imports. No I/O.              |
| `services/api`           | Lambda handlers + thin AWS adapters (S3, Textract, DynamoDB, Bedrock) |
| `services/template.yaml` | AWS SAM infrastructure                                                |
| `apps/web`               | Frontend                                                              |
| `fixtures`               | Programmatic synthetic demo document generator                        |
| `docs`                   | Architecture, design system, threat model, cost, cleanup, submission  |

## 3. The status decision boundary — read twice

**Application code decides status. Bedrock never does.**

`packages/rules` is the single source of truth for every status and finding. It is pure and fully
unit tested. Bedrock is called _after_ the status is already final, and may only:

- explain an existing finding in simpler words
- translate that explanation to Hindi or Gujarati
- return concise structured JSON matching the explanation schema

Bedrock **must never** determine status, decide eligibility, add requirements, change extracted
values, declare authenticity, invent evidence, or predict acceptance.

**Bedrock cannot determine application status.** If Bedrock is unavailable, returns invalid JSON, or
fails schema validation: keep the deterministic result, fall back to reviewed predefined English
explanations, mark translations unavailable, and keep the analysis fully functional. A Bedrock
failure is never an analysis failure.

Mask sensitive values (bank account numbers) **before** the Bedrock call, not after.

## 4. Coding conventions

- TypeScript, `strict: true`, ESM throughout.
- Zod at trust boundaries only: API request bodies, Textract responses, Bedrock output. Do not
  re-validate data that has already crossed a validated boundary.
- No `any`. No non-null assertions outside tests.
- Keep `packages/rules` free of AWS SDK imports — a test asserts this.
- Adapters wrap AWS SDK calls behind narrow interfaces so handlers are testable with mocks.
- Error handling: internal detail to CloudWatch, safe generic message to the client.
- Do not add abstractions for a single caller. Do not add speculative features.
- Never remove security, validation, accessibility, error handling, or data-loss protection to
  simplify something.

## 5. Common commands

```bash
npm install              # install all workspaces
npm run verify           # format:check + lint + typecheck + test + build  (run before commits)
npm run test             # all workspace tests
npm run fixtures         # regenerate synthetic demo documents into fixtures/out
npm run dev -w apps/web  # frontend dev server
# Lambda bundles are built by esbuild directly, NOT by SAM's esbuild builder.
# Always build before packaging or deploying — SAM only zips services/api/dist/*.
npm run build -w @kagazready/api

cd services
sam validate --lint --template template.yaml
sam build --template template.yaml
sam deploy --guided      # first deploy only; afterwards plain: sam deploy
```

### Why the Lambda build works the way it does

`services/api/build.mjs` bundles each handler with esbuild and writes `dist/<name>/`. SAM then only
has to zip a directory. Two things forced this, and both will bite again if someone switches back to
`BuildMethod: esbuild`:

- SAM's esbuild builder looks for esbuild in the function's own `node_modules/.bin`; npm workspaces
  hoist it to the repository root, so it is never found.
- By default SAM copies `CodeUri` to a scratch directory and runs `npm install` there, which cannot
  resolve `@kagazready/contracts` or `@kagazready/rules` — they are workspace symlinks, not
  published packages, so npm asks the public registry and gets a 404.

Each `dist/<name>/package.json` carries `"type": "commonjs"` (this package is `"type": "module"`,
which would otherwise make Node parse the CJS bundle as ESM and hide the handler export) plus a name
and version (npm refuses to pack a directory without them). `build.mjs` loads every bundle and
asserts the handler export before finishing.

`services/samconfig.toml` sets `build_in_source = true` and pins the region and stack name. Set
`SAM_CLI_TELEMETRY=0` when running SAM: this is a document-privacy project and build metadata does
not need to leave the machine.

## 6. AWS region

- Primary region for S3, Lambda, API Gateway, DynamoDB, Textract: **ap-south-1 (Mumbai)**.
- Bedrock region and model ID are configured via env vars `BEDROCK_REGION` and `BEDROCK_MODEL_ID`
  because model availability differs by region. **Verify against official AWS documentation before
  changing.** Never hardcode a model ID in source.
- Amplify Hosting region is recorded in `docs/architecture.md`.

## 7. Security boundaries

- S3 bucket: Block Public Access on all four settings, encryption at rest, no public policy, ever.
- Presigned uploads: randomized keys, short expiry, restricted prefix, restricted content type,
  restricted content length.
- Before processing: verify object exists, key prefix matches the analysis, size, content type,
  document count, and analysis state.
- Analysis IDs are unguessable (crypto random). Deletion is bound to the analysis ID.
- No secrets in frontend code. No raw OCR text in production logs. Bank account numbers masked in
  every output, log, and Bedrock prompt.
- Retention: S3 lifecycle deletion within 1 day, DynamoDB TTL within 24 hours, immediate deletion
  endpoint, short CloudWatch retention.
- **Do not collect Aadhaar.** Do not add a field, rule, or prompt that asks for it.
- Restrictive CORS in production. Security headers on the frontend.
- API throttling, daily analysis cap, bounded Textract calls, bounded Bedrock tokens.

## 8. Cost limits

Approximately USD 25 of credits. Expected total below USD 10. Warning at USD 10, urgent review at
USD 18, absolute boundary at USD 23. See `docs/cost-estimate.md`.

Do not create continuously billed infrastructure. Explicitly forbidden: EC2, ECS, EKS, RDS,
OpenSearch, NAT Gateway, Cognito, Step Functions, SQS, SNS, WAF, provisioned concurrency, Bedrock
provisioned throughput.

## 9. Testing requirements

- `packages/rules`: exhaustive unit tests. Every rule, every status, Unicode names, masking, IFSC,
  dates, OCR confidence thresholds.
- `services/api`: handler tests with mocked AWS SDK clients. Cover the failure paths — invalid MIME,
  oversized file, bad key, missing object, Textract failure, Bedrock failure, invalid Bedrock JSON,
  expired analysis, repeated request, daily cap, safe errors.
- `apps/web`: Vitest + React Testing Library for every UI state, keyboard navigation, and reduced
  motion.
- Playwright: the full demo journey.
- Real AWS smoke tests after deployment, recorded in `VERIFICATION.md`.

Tests verify correctness. Never shape an implementation purely to satisfy a fixture, and never claim
a check passed unless it actually ran successfully.

## 10. Technology constraints

Use React, Vite, TypeScript, Tailwind, GSAP + `@gsap/react`, Amplify Hosting, Lambda, API Gateway
HTTP API, private S3, Textract `DetectDocumentText`, DynamoDB, Bedrock, CloudWatch, SAM, Vitest,
React Testing Library, Playwright.

Do not add: Next.js, Framer Motion, React Spring, Anime.js, or any animation library other than
GSAP. PDF support is out of scope for the MVP — JPEG and PNG only, max 5 MB each, max 3 documents
per analysis, single-page images.

## 11. Motion rules

Use `useGSAP()` from `@gsap/react` so animations are scoped and cleaned up. Animate transforms and
opacity only. Respect `prefers-reduced-motion` — reduced-motion users get an immediate, complete
interface with no information hidden behind animation. No scroll hijacking, no fake progress
percentages, no elastic easing on serious status messages, no animation added merely because GSAP is
installed.

## 12. Git

Small, meaningful commits. Never commit credentials, `.env`, real documents, personal data,
machine-local Claude settings, or Impeccable caches. Never backdate or manufacture history, never
force-push, never bypass hooks with `--no-verify`.
