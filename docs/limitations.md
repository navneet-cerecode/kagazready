# Limitations

Stated plainly so a judge does not have to discover them.

## Bedrock is deployed off

The live stack runs with `BEDROCK_MODEL_ID` empty. This is the one blocked check in `tests.json`.

What happened, in order, on 2026-09-18:

1. The account returned `AccessDeniedException: Your account is currently being verified` for
   every Bedrock call. That cleared after about two hours.
2. Every model then returned `ValidationException: Operation not allowed`, including the intended
   `apac.amazon.nova-lite-v1:0`.
3. `aws service-quotas list-service-quotas --service-code bedrock` showed all 75 "requests per
   minute" quotas at **0** on this new account (AWS default for Nova Lite is 400), and "tokens per
   day" at 0. Two of the three relevant quotas cannot be raised through Service Quotas.
4. Credits are not the cause: the account holds USD 120 in credits with USD 0 used, and Bedrock is
   on the covered list.
5. An AWS Support limit-increase case was submitted the same day. Basic Support responds in about
   24 hours; the case was open at the time of writing.

What that means for the product: **nothing that decides anything.** Every status and every finding
comes from `packages/rules`; every title, reason and action exists as reviewed copy in English,
Hindi and Gujarati. Bedrock only ever adds one plain-language sentence per finding. With it off, the
interface shows the reviewed English sentence, labels it "reviewed English", and reports
`explanationsDegraded: true` in the API response. The Bedrock adapter, the output schema, the
forbidden-word rejection and every failure path are unit-tested against a fake client
(`services/api/src/adapters/bedrock.ts`, `handlers.test.ts`).

If the quota is granted before judging: `sam deploy --parameter-overrides
BedrockModelId=apac.amazon.nova-lite-v1:0` and run the en/hi/gu smoke test; `tests.json` will be
updated with the evidence. If not, the deployed behaviour is exactly what the brief calls for when
Bedrock is unavailable.

## Language

- Hindi and Gujarati interface copy and rule copy were written carefully but have **not been
  reviewed by a native speaker.** They should be before any real use.
- Documents are matched by English labels (`Name`, `Account No`, `IFSC`, …) with several aliases.
  A marksheet or certificate printed only in Hindi or Gujarati will produce "field missing"
  findings rather than being read. Names in Devanagari or Gujarati script _are_ compared correctly
  when they appear next to a recognised label.

## Documents

- JPEG and PNG only; no PDF; single page; 5 MB each; at most three per check.
- One scholarship template (`scholarship-readiness-general` 1.0.0). Requirements differ between
  scholarships and the interface says so on every screen. The template was derived from published
  National Scholarship Portal guidance and last reviewed 2026-09-17; it is not endorsed by anyone.
- `DetectDocumentText` reads printed text well and handwriting poorly. A handwritten passbook page
  will mostly come back as "unclear".
- The synthetic fixtures are the only documents this system has been run on end-to-end. Real
  marksheets from different boards will exercise label aliases the template does not have yet.

## Security and privacy

- The analysis id is a bearer capability with no sign-in; anyone holding it can read the masked
  result, replace a document, or delete it until it expires. Accepted for a session designed to
  last minutes (`docs/threat-model.md`, T4).
- The daily cap is global, so a hostile client can lock the demo for the rest of the UTC day.
  Accepted in preference to spending the budget (T3).
- Some AWS AI services may, by default, store content to improve the service unless the account
  owner sets an AI-services opt-out policy through AWS Organizations. This hackathon account is
  not in an organization and has not set one. Anyone deploying this for real use should.
- Textract sees the full image. That is the service's purpose; there is no way to OCR a document
  without reading it.

## Product

- One check at a time; nothing is remembered between visits, by design. A student who closes the
  tab starts again.
- No thumbnail of the uploaded photo is shown on the result. The evidence line (what Textract read)
  stands in for it. A thumbnail was the critique's strongest suggestion and is the first thing to
  add after the hackathon.
- The Latin webfonts are not preloaded, so the very first visit may show a brief font swap.
  Measured layout shift stays under 0.1.
- No dark mode. The paper ground is the design; `color-scheme: light` is declared deliberately.

## Testing

- Playwright runs against the public URL and real Textract; it is not run in CI because there is
  no CI (no GitHub Actions were added — the brief did not ask for them, and every run costs
  Textract pages).
- The Ponytail complexity review has not been run: the plugin is not installed on the build
  machine. Its published principles were applied by hand and are listed in `ATTRIBUTIONS.md`.
