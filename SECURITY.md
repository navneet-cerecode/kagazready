# Security

KagazReady handles identity, income and bank documents. This file states what the deployed system
does to protect them, in the words of the implementation. The reasoning and the accepted residual
risks are in [docs/threat-model.md](docs/threat-model.md).

## Reporting a problem

This is a hackathon project by Team DiuDaman, not a production service. If you find a security
problem, please open a private report to the repository owner rather than a public issue, and
include the analysis ID and time (UTC) if the problem involved a live check. There is no bug bounty.

## Controls in place

**Uploads**

- Browsers upload straight to a private S3 bucket using a presigned POST whose policy pins the
  exact object key, the content type (`image/jpeg` or `image/png`) and a size range of 1 byte to
  5 MB. The presigned policy expires after 120 seconds.
- Object keys are `uploads/<128-bit random analysis id>/<document type>/<64-bit random>.<ext>`.
- The bucket has Block Public Access on all four settings, bucket-owner-enforced ownership,
  server-side encryption, a policy denying non-TLS requests, and a lifecycle rule that deletes
  everything under `uploads/` after one day.
- Before any document is processed, the API confirms with S3 that the object exists under this
  analysis's prefix and that its stored size and type are within limits.

**Processing**

- Extracted text exists only in Lambda memory for the duration of one invocation. It is never
  stored and never logged.
- Bank account numbers are masked to their last four digits by the rule engine before any value
  is stored, logged, rendered, or included in a Bedrock prompt.
- The overall status and every finding are decided by deterministic code
  (`packages/rules`). Bedrock is only asked to rephrase or translate a finding that already
  exists; its output is validated against a strict schema that rejects decision words and any
  reference to a finding that was not sent. Invalid or unavailable output falls back to reviewed
  English copy.

**Storage and retention**

- Results are stored in DynamoDB with a six-hour TTL. The code also refuses to return an expired
  item, because DynamoDB's TTL deletion is not immediate.
- `DELETE /analyses/{id}` removes the stored result and every object under the analysis prefix
  immediately.
- CloudWatch logs are retained for seven days, and every log line passes through a digit-run
  redactor. API access logs carry route, status, latency and request id only.

**API**

- HTTP API with CORS restricted to the single deployed frontend origin.
- Throttling at 10 requests per second, burst 20. A daily analysis cap (default 150) is enforced
  atomically in DynamoDB before Textract is called.
- Four Lambda functions with four separate roles; each holds only the permissions its routes use.
  The function that can spend on Textract cannot delete; the function that can delete cannot call
  Textract; the health check can do neither.
- Every request body and path parameter is validated with zod. Errors return a generic message and
  a correlation id; internal detail goes to CloudWatch only.

**Frontend**

- Served by Amplify Hosting with a strict Content-Security-Policy (`script-src 'self'`, no inline
  scripts or styles, `connect-src` limited to the API and S3 in ap-south-1,
  `frame-ancestors 'none'`), HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy` and
  `Cross-Origin-Opener-Policy: same-origin`. The headers are in `apps/web/customHttp.yml`.
- No cookies, no web storage, no third-party scripts, no analytics. Fonts are self-hosted.

**Repository**

- No secrets exist in the application. `.env*` files, Claude Code local settings, Impeccable
  caches, generated fixtures and any `private/` or `samples-real/` path are gitignored.
- The AWS account id, access keys and real documents do not appear in any committed file.

## What is deliberately not done

- No sign-in. The analysis id is the only capability; it is unguessable and short-lived.
- No Aadhaar collection, in any field, rule, prompt or copy.
- No serving uploaded images back to the browser.
- No AWS WAF, Cognito, or other continuously billed protection — the budget rules in `CLAUDE.md`
  forbid them, and throttling plus the daily cap cover the demo's exposure.

## Dependency hygiene

`npm audit --omit=dev` reported 0 vulnerabilities on 2026-09-18. Vitest was upgraded to 5.x during
the build after advisories against 2.x.
