# Threat model

Written from the implementation as deployed on 2026-09-18, not from the design. Every mitigation
below names the file that implements it; if the file changes, this document is wrong until it is
re-read.

## What is being protected

1. **The student's documents.** A Class XII marksheet, an income certificate and a bank passbook
   page together identify a person, their family income and their bank account. They are the most
   sensitive thing the system touches, and the system's whole job is to look at them.
2. **The team's AWS credits.** Textract and Bedrock are metered per call. A public demo with no
   sign-in is an invitation to run up a bill.
3. **The honesty of the result.** A status the student trusts must come from rules that can be
   read and tested, never from a model, and never from an attacker.

Out of scope: availability guarantees (this is a demo), and protecting the AWS account itself
beyond what the CLI and console already do (root account with `aws login` sessions; no long-lived
keys exist on any machine).

## System boundary

```
Student's browser ──HTTPS──▶ Amplify Hosting (static, CSP)                      trust: none
       │
       ├─POST /uploads──────▶ API Gateway ──▶ UploadsFunction  (s3:PutObject uploads/*)
       ├─POST (presigned)───▶ S3 private bucket                                   trust: none
       ├─POST /analyses─────▶ API Gateway ──▶ AnalysesFunction (s3:GetObject, textract, bedrock, ddb rw)
       ├─GET  /analyses/{id}─▶ API Gateway ──▶ AnalysisFunction (s3:DeleteObject/List, bedrock, ddb rwd)
       └─DELETE /analyses/{id}┘
                                              ▼
                                   Textract · Bedrock · DynamoDB (TTL) · CloudWatch
```

Nothing in the browser is trusted. Every Lambda validates its own inputs with zod at the boundary
(`services/api/src/http.ts` `parseBody`, `parsePathParam`) and treats S3, not the client, as the
authority on what was uploaded (`services/api/src/runAnalysis.ts` `verifyUploadedObject`).

## Assets and their exposure

| Asset                        | Where it lives                         | For how long                                                                        |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Document images              | S3 `uploads/<analysisId>/<type>/<rnd>` | Until DELETE, or the 1-day lifecycle rule (`services/template.yaml` `UploadBucket`) |
| Extracted text               | Lambda memory only                     | The duration of one invocation. Never written to DynamoDB or logs.                  |
| Masked findings and readings | DynamoDB `AnalysisTable`               | `ANALYSIS_TTL_SECONDS` (6 h), checked in code, not only by DynamoDB TTL             |
| Bank account number          | Masked to last four before storage     | Only the masked form is ever stored, logged, rendered, or sent to Bedrock           |
| Analysis ID                  | Browser memory, URL path of API calls  | The page session. Not written to `localStorage`, `sessionStorage` or cookies.       |
| Access logs                  | CloudWatch, 7-day retention            | Route, status, latency, request ID only — no body, query string or headers          |

## Threats, mitigations, residual risk

### T1 — Someone other than the student reads their documents

- **S3 is private by construction.** Block Public Access on all four settings, `BucketOwnerEnforced`,
  SSE-S3, and a bucket policy that denies any non-TLS request (`services/template.yaml`).
- **Upload without credentials.** The browser gets a presigned POST whose policy pins the exact key,
  the content type and a `content-length-range` of 1..5 MB, and expires in minutes
  (`services/api/src/adapters/s3.ts` `presignUpload`). It cannot read, list, or write anywhere else.
- **Keys are unguessable.** `uploads/<32 hex>/<type>/<16 hex>.<ext>`: 128 random bits for the
  analysis, 64 more for the object (`newAnalysisId`, `newObjectKey`).
- **No Lambda can read outside the prefix.** `AnalysesFunction` has `s3:GetObject` on `uploads/*`
  only, and `assertKeyBelongsToAnalysis` refuses any key outside `uploads/<thisAnalysis>/<type>/`
  before Textract is called. Textract reads the object; the Lambda never streams document bytes.
- **Residual:** anyone who obtains a live analysis ID can read the _masked result_ until it expires
  (see T4). The images themselves are never served back to anyone — there is no download route.

### T2 — Documents or extracted text leak through logs or the model

- `services/api/src/http.ts` routes every log line through `redactDigitRuns` from the rule engine,
  and the pipeline logs only status, finding count and rule ids (`runAnalysis.ts`). API Gateway
  access logs are configured with an explicit format that carries no body, query or headers.
- The Bedrock prompt is built from findings that the rule engine has already masked; raw OCR lines
  are not in it (`services/api/src/adapters/bedrock.ts`). Output is bounded by `maxTokens`.
- **Residual:** Textract itself sees the full image — that is the service's purpose. AWS's AI
  services data policy applies: by default, some AWS AI services may store content to develop and
  improve the service unless the account sets an AI services opt-out policy (an AWS Organizations
  feature). This account has not configured one. That is recorded in `docs/limitations.md` and
  `PRIVACY.md` rather than glossed over.

### T3 — Running up the bill

- API Gateway throttling: 10 requests/second, burst 20, across the whole API.
- **A daily cap enforced atomically.** `reserveDailyAnalysisSlot` (`services/api/src/adapters/store.ts`)
  increments a per-day counter with `ConditionExpression: attribute_not_exists(#count) OR #count < :cap`.
  DynamoDB refuses the increment at the cap, and the refusal happens _before_ Textract is called.
  Default 150 analyses/day ≈ 450 Textract pages ≈ USD 0.70/day at list price.
- Idempotent create: a repeated `POST /analyses` with the same ID returns the stored result and does
  not call Textract again (`handlers/analyses.ts`).
- At most 3 documents per analysis, each at most 5 MB, single page; Bedrock output tokens bounded.
- **Residual and accepted:** the cap is global, so one hostile client can exhaust the day's quota
  and lock everyone else out until midnight UTC. For a demo, denying service is preferable to
  spending the budget. Raising `DailyAnalysisCap` is a one-parameter redeploy.

### T4 — Acting on someone else's analysis

The analysis ID is the only capability. There are no accounts.

- IDs are 128 random bits from `crypto.randomBytes`; they are never enumerable (no list route).
- Delete is bound to the ID: the S3 prefix to delete is derived server-side from the path
  parameter, never taken from the body (`deleteAnalysisObjects`).
- IDs travel only in the URL path and JSON bodies over TLS; `Referrer-Policy: no-referrer` on the
  frontend, and the API never redirects.
- **Residual and accepted:** the ID is a bearer token. Anyone who has it (shoulder-surfing the
  network tab, a shared device) can read the masked result, replace a document, or delete it, until
  it expires. This is the same model as an unlisted link and is appropriate for a session that is
  meant to last minutes and then be deleted.

### T5 — A malicious document

- **Type and size.** Declared type is validated against the template's list at presign time and
  pinned in the S3 policy; after upload, `HeadObject` re-checks size and type against what S3
  actually stored. A file that lies about its type reaches Textract, which rejects it; the analysis
  fails safely with a generic error.
- **A failed run is not sticky.** `handlers/analyses.ts` deletes its own `processing` item when
  the pipeline throws, and takes over a `processing` item older than the function timeout, so a
  missing upload, a Textract outage or the daily cap cannot lock an analysis id out until the TTL
  (found live during the 2026-09-18 audit: every retry answered 409 for six hours).
- **Prompt injection through the image.** Text in a document does reach Bedrock, but only as
  _masked finding values_, and Bedrock's output cannot change anything that matters: the schema
  (`packages/contracts/src/bedrock.ts`) accepts only a plain-language note per known finding id,
  rejects any decision word, and the status was final before the call. Rejected output falls back
  to reviewed English (`present.ts`). Tests cover invalid JSON, schema failure, forbidden words,
  and an explanation naming a finding that was never sent.
- **Residual:** none identified beyond Textract misreading the document, which the confidence
  thresholds are designed to surface as "unclear" rather than hide.

### T6 — Attacks on the frontend

- Strict CSP from Amplify (`apps/web/customHttp.yml`): `script-src 'self'`, no inline scripts or
  styles, `connect-src` limited to the API origin and S3 in `ap-south-1`, `frame-ancestors 'none'`,
  `object-src 'none'`. Plus HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  a restrictive `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin`.
- No `dangerouslySetInnerHTML`, no `innerHTML`, no cookies, no web storage in the app.
- All strings from the API are rendered as React text nodes.
- **Residual:** `connect-src` allows `https://*.s3.ap-south-1.amazonaws.com` rather than the one
  bucket host. Pinning it would put the bucket name in a committed file; the wildcard was kept.
  With `script-src 'self'` and no inline code, the path to exploiting it (script injection) is
  already closed.

### T7 — Cross-origin abuse of the API

- API Gateway CORS allows exactly one origin (`AllowedOrigin`, pattern-validated, `*` refused by
  the parameter pattern), methods `GET POST PUT DELETE OPTIONS`, header `content-type` only.
- The bucket's CORS allows `POST` from that origin only.
- **Residual and accepted:** CORS is a browser control. A script outside a browser can call the
  API directly; that is what throttling, the cap and unguessable IDs are for. There is no sign-in
  by design (PRODUCT.md: "No accounts, no history").

### T8 — Blast radius inside AWS

- Four functions, four roles, each scoped to its routes (`services/template.yaml`): the function
  that spends on Textract cannot delete uploads (it may delete only its own unfinished table item,
  so a failed run can be retried); the function that deletes cannot call Textract; the health check
  has no permissions beyond its own log group.
- `AnalysesFunction` holds `s3:ListBucket` restricted to the `uploads/` prefix. Without it S3
  answers `HeadObject` on a missing key with 403 instead of 404, and "please upload that document
  again" surfaced as a 500 on the deployed stack while the mocked tests passed.
- `textract:DetectDocumentText` is `Resource: '*'` because Textract does not support resource
  scoping for it. `bedrock:InvokeModel` spans regions because cross-region inference profiles
  (`apac.*`) route to other regions. Both are read-only, metered actions.
- Stack deletion removes the bucket and table (`DeletionPolicy: Delete`) — deliberately, so no
  documents outlive a `sam delete`.

### T9 — Secrets and the repository

- There are no application secrets: the API is unauthenticated, Lambda uses its role, the frontend
  has only a public API URL. `.env*` files are gitignored; `apps/web/.env.example` documents the one
  variable.
- The repository was scanned for access-key patterns, the account ID, and secret-looking strings
  before publication; the AWS account ID does not appear in any committed file.
- Developer credentials are `aws login` sessions that expire within hours; no `~/.aws/credentials`
  file with long-lived keys was ever created.

## Things this system deliberately does not do

- Collect Aadhaar, or ask for it in any field, rule, prompt or copy.
- Keep OCR text, even masked, beyond the invocation.
- Serve uploaded images back to the browser.
- Claim authenticity, eligibility or approval; the words are grep-blocked in tests and in the
  Bedrock output schema.

## Review record

- 2026-09-18 — review of `services/template.yaml`, `services/api/src/**`, `apps/web/src/**`,
  `apps/web/customHttp.yml`, `.gitignore`, `npm audit --omit=dev` (0 vulnerabilities). One
  documentation defect fixed (the read/delete function's description claimed it could not call
  Bedrock while holding `bedrock:InvokeModel` for the language-switch path). No code change was
  needed; the residual risks above are accepted for a demo of this scope.
