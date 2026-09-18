# Architecture

## Services and regions

| Concern          | Service                                 | Region     | Billing model                 |
| ---------------- | --------------------------------------- | ---------- | ----------------------------- |
| Frontend hosting | AWS Amplify Hosting (manual deployment) | ap-south-1 | Per GB stored and served      |
| API              | Amazon API Gateway HTTP API             | ap-south-1 | Per request                   |
| Compute          | AWS Lambda (Node.js 22, arm64)          | ap-south-1 | Per request and GB-second     |
| Uploads          | Amazon S3 (private)                     | ap-south-1 | Per GB-month and request      |
| OCR              | Amazon Textract `DetectDocumentText`    | ap-south-1 | Per page                      |
| Explanations     | Amazon Bedrock (Converse API)           | configured | Per token; **off at present** |
| Results          | Amazon DynamoDB (on-demand, TTL)        | ap-south-1 | Per request                   |
| Logs             | Amazon CloudWatch Logs (7-day)          | ap-south-1 | Per GB ingested               |
| Infrastructure   | AWS SAM / CloudFormation                | ap-south-1 | Free                          |

Nothing bills while idle. The forbidden list in `CLAUDE.md` (EC2, ECS, RDS, NAT, Cognito, WAF,
provisioned concurrency, …) was respected: the stack contains no continuously billed resource.

## Request flow

```
1. POST /uploads {documentType, contentType, contentLength, analysisId?}
      UploadsFunction validates → creates a presigned S3 POST
      key = uploads/<analysisId>/<documentType>/<random>.<ext>, policy pins key, type, 1..5 MB, 120 s
      → 201 {analysisId, objectKey, upload:{url, fields}}

2. Browser POSTs the file to S3 with the returned fields (XHR, progress reported)

3. POST /analyses {analysisId, language, documents:[{documentType, objectKey}]}
      AnalysesFunction
        create item (conditional put → idempotent; a repeat returns the stored result)
        for each document: key under this analysis's prefix? HeadObject: exists, size, type?
        reserve a slot against today's cap (conditional DynamoDB update)
        Textract DetectDocumentText ×N (in parallel, bounded to 3)
        rules.analyze(...)  → status + findings + masked readings       ← the decision
        present(...)        → reviewed copy in the chosen language,
                              Bedrock rephrase if configured, else fallback
        store result with expiresAt
      → 201 AnalysisResponse

4. GET /analyses/{id}?language=hi
      AnalysisFunction reads, re-presents in the requested language (cached per language)

5. PUT /analyses/{id}/documents/{documentType} {objectKey, language}
      same pipeline as 3 with one key replaced; every document is re-read (see below)

6. DELETE /analyses/{id}
      delete the item; list and delete every object under uploads/<id>/
```

### Why every replacement re-reads all three documents

Caching OCR text would save two Textract pages per replacement but would mean storing the unmasked
account number. Two pages cost a fraction of a cent. Keeping the number out of the database wins.

### Why four Lambda functions

Least privilege by route. `UploadsFunction` can only put objects under `uploads/*`.
`AnalysesFunction` can read objects, call Textract and Bedrock, and write the table.
`AnalysisFunction` can read/update/delete the table and delete objects — and call Bedrock only to
translate an already-decided result — but cannot call Textract. `HealthFunction` has no
permissions beyond its own log group.

## The status decision boundary

```
Textract lines ──▶ packages/rules ──▶ { overallStatus, findings[], readings[] }   FINAL
                                                │
                                                ▼ (masked)
                                     Bedrock: "say this finding in plainer words"
                                                │
                            schema-validate ────┼──── reject: decision words, unknown finding ids,
                                                │            invalid JSON, timeout (6 s)
                                                ▼
                                 explanation text, or reviewed English fallback
```

`packages/rules` is pure: a test asserts it imports no AWS SDK, reads no clock and never logs.
Titles, reasons and suggested actions for every rule exist as reviewed copy in English, Hindi and
Gujarati, so localisation does not depend on Bedrock at all. Bedrock adds one optional plain-language
sentence per finding; when it is unavailable the response says so (`explanationsDegraded`,
`translationUnavailable`) and the interface labels the note "reviewed English".

`BEDROCK_MODEL_ID` is a stack parameter with no default. Empty is a supported configuration and is
what is deployed today; see `docs/limitations.md` for why.

## Frontend

React 19 + Vite + TypeScript, Tailwind v4 with the design tokens in `apps/web/src/styles/tokens.css`,
GSAP via `@gsap/react` for the few movements that exist (all gated behind
`prefers-reduced-motion: no-preference`). State is a reducer in `apps/web/src/flow/useCheckFlow.ts`
with phases `compose → uploading → analysing → result → deleting → deleted`. The API client is a
thin fetch/XHR wrapper. No router, no global store, no component library.

Served as a static site by Amplify Hosting with the headers in `apps/web/customHttp.yml`
(applied with `aws amplify update-app --custom-headers`). Deployments are manual zips produced by
`scripts/deploy-web.py`, which exists because PowerShell's `Compress-Archive` writes backslash paths
that Amplify cannot serve.

## Build and deploy

Lambda bundles are produced by `services/api/build.mjs` (esbuild → CommonJS, one directory per
function with its own `package.json`), not by SAM's esbuild builder; `CLAUDE.md` records the two
reasons (workspace hoisting and workspace symlinks). `sam build` then only zips `services/api/dist/*`.

```bash
npm run build -w @kagazready/api
cd services && sam build --template template.yaml && sam deploy
VITE_API_BASE_URL=<ApiBaseUrl output> npm run build -w @kagazready/web
python scripts/deploy-web.py
```

`services/samconfig.toml` pins region, stack name, `build_in_source`, and the parameter overrides
(`AllowedOrigin` = the Amplify origin, `DailyAnalysisCap=150`, `BedrockModelId=` empty).

## Fixtures

`fixtures/` renders four synthetic PNGs with invented identities and no institutional branding,
each stamped "SYNTHETIC DEMO DOCUMENT — NOT VALID" with a diagonal watermark. The bank proof for the
"needs review" scenario is rendered with a scratched account number whose Textract confidence was
measured at 61.9% when first calibrated and 62.2% for the rendering now shipped (the scratches are
random per render; calibration runs land in the 56–63% band, `fixtures/out/calibration.txt`)
against a rule threshold of 88%; the threshold was never moved to fit the image. The IFSC line is
`SYNB0234567`: the earlier `SYNB0001234` read at 89.5%, too close to the field's 88% threshold. `npm run fixtures -- apps/web/public/samples` regenerates them
where the frontend serves them.
