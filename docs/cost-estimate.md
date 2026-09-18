# Cost estimate

## Budget rules

From the brief and `CLAUDE.md`: approximately USD 25 of hackathon credits were requested; expected
total below USD 10; **warning at USD 10, urgent review at USD 18, absolute boundary at USD 23.**

## Credits actually on the account (Billing console, 2026-09-18)

| Credit                                         | Amount  | Used  | Expires    |
| ---------------------------------------------- | ------- | ----- | ---------- |
| AWS Free Tier (new-account credit)             | $100.00 | $0.00 | 2027-08-31 |
| Explore AWS: Create a web app using AWS Lambda | $20.00  | $0.00 | 2027-08-27 |

Every service KagazReady uses is on the credits' covered-services list (Textract, Bedrock, Lambda,
API Gateway, DynamoDB, S3, Amplify, CloudWatch, CloudFormation). Free-tier allowances used so far:
Textract 82 of 1,000 free pages this month, Lambda 7 of 1,000,000 requests. **Total billed to
date: USD 0.00.** The budget rules above still apply as written; the credits do not raise them.

A cost budget with email alerts was created in the Billing console at the thresholds above.

## Unit prices used (ap-south-1 list prices, checked 2026-09-17)

| Item                                | Price                                  |
| ----------------------------------- | -------------------------------------- |
| Textract DetectDocumentText         | ~USD 0.0015 per page                   |
| Bedrock Amazon Nova Lite (intended) | ~USD 0.00006 / 1K in, 0.00024 / 1K out |
| Lambda (arm64)                      | USD 0.20 per 1M requests + GB-s        |
| API Gateway HTTP API                | USD 1.00 per 1M requests               |
| DynamoDB on-demand                  | ~USD 1.25 per 1M writes                |
| S3                                  | ~USD 0.025 per GB-month                |
| Amplify Hosting                     | USD 0.15 per GB served                 |

## Per-analysis cost

One full check: 3 Textract pages ≈ USD 0.0045. One replacement: another 3 pages (every document
is re-read; see `docs/architecture.md`). Bedrock, if enabled: ~1,000 input + ~400 output tokens per
call ≈ USD 0.00016. Lambda, API Gateway, DynamoDB and S3 together: well under USD 0.001.

**≈ USD 0.005 per complete demo journey** (check + one replacement, Bedrock off) and
**≈ USD 0.0055 with Bedrock on.**

## Build-phase spend to date

| Activity                                    | Textract pages | Cost      |
| ------------------------------------------- | -------------- | --------- |
| Fixture calibration (7 qualities × 1 page)  | 7              | free tier |
| Live Textract tests (8 tests)               | ~24            | free tier |
| Manual verification and Playwright (15 × 6) | ~90            | free tier |
| Audit and polish checks                     | ~9             | free tier |
| Bedrock attempts                            | 0 successful   | USD 0.00  |
| Everything else                             |                | USD 0.00  |

Total: 82 Textract pages inside the 1,000-page free tier; **USD 0.00 billed.**

## Ceilings that stop a surprise

- `DailyAnalysisCap=150` → at most 450 Textract pages/day ≈ USD 0.68/day, enforced before Textract
  is called. Even a month of a maxed-out cap stays under USD 21, and the demo will not run for a
  month.
- API throttling 10 rps / burst 20.
- Bedrock output capped at 700 tokens per call, 8 findings per call, 6-second timeout.
- No continuously billed resource exists. Idle cost is the S3 storage of a few kilobytes that
  expire within a day.

## Projection for judging week

Assume 200 demo journeys (a generous number): 1,200 Textract pages ≈ USD 1.80 (or free within the
remaining free-tier pages), plus Amplify traffic of a few MB per visit ≈ USD 0.10. **Expected
total for the whole hackathon: under USD 3**, with the boundary at USD 23 and USD 120 of credits
available.

## Cleanup

`docs/aws-cleanup.md`. Once the stack and the Amplify app are deleted, the account bills nothing.
