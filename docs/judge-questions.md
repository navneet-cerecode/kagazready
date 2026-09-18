# Questions a judge might ask

Short, honest answers, with the file that backs each one.

**"Isn't this just OCR plus an LLM?"**
No. The status and every finding come from a pure, unit-tested rule engine (`packages/rules`, 130
tests). The LLM is called after the decision is final, receives only masked findings, and may only
rephrase or translate. Its output is validated against a schema that rejects decision words and
unknown finding ids; on any failure the reviewed English copy is used. Today the deployment runs
with Bedrock off and the product is fully functional — which is the proof that it never decided
anything. `docs/architecture.md`, `services/api/src/adapters/bedrock.ts`.

**"Why is Bedrock off?"**
This new AWS account has every Bedrock request quota set to zero — not a credit problem (USD 120 of
credits, USD 0 used, Bedrock covered), not a model-access problem (that console page is retired).
Two of the three quotas cannot be raised through Service Quotas; a Support case was filed on
2026-09-18. The adapter, schema and failure paths are tested against a fake client; the smoke test
against the real service is recorded as **blocked**, not as passing. `docs/limitations.md`,
`tests.json`.

**"How do you know the confidence threshold isn't tuned to your demo image?"**
The threshold (88% for account numbers) was fixed first; the fixture was then calibrated against
real Textract until one rendering genuinely fell below it. Seven qualities were measured
(`fixtures/out/calibration.txt`): most read at 98–99%, some vanished entirely, and one — a
scratched rendering — came back at 61.9% with one digit misread. The test asserts the threshold is
never lowered to fit an image. `progress.md` ("Textract confidence is close to bimodal").

**"What happens to the documents?"**
Straight from the browser to a private bucket under a presigned policy (key, type, size pinned,
120-second expiry). Textract reads them; the text lives in Lambda memory only. The result is stored
masked with a six-hour TTL that the code also enforces; objects expire in a day; Delete removes
both immediately. Logs are digit-redacted and kept seven days. `PRIVACY.md`, `docs/threat-model.md`.

**"Is the account number ever stored in full?"**
No. The rule engine masks it to the last four digits before anything is stored, logged, rendered or
sent to Bedrock. A handler test asserts the full number never appears in any response or log. A
replacement re-reads all three documents precisely so that OCR text never has to be cached.

**"Who can see a result?"**
Anyone holding the analysis id — 128 random bits, never listed, valid for six hours or until
Delete. There is no sign-in, by design (one check, then delete). This is stated as an accepted risk
in `docs/threat-model.md` (T4).

**"What stops someone running up your Textract bill?"**
API throttling (10 rps, burst 20), a daily cap of 150 analyses enforced atomically in DynamoDB
_before_ Textract is called, at most three documents of 5 MB each, and idempotent creation. Worst
case is about USD 0.70 a day. `docs/cost-estimate.md`.

**"Why does it say 'Needs review' and not 'Rejected'?"**
Because it cannot know. The only three statuses are Incomplete, Needs review and No issues found;
the words Approved, Eligible, Verified, Guaranteed and Rejected are blocked in copy, code, tests
and in the Bedrock output schema. The product is a readiness check, not an authority, and says so
on every screen.

**"Are the Hindi and Gujarati real, or machine-translated?"**
Written as reviewed static copy for every rule, title, reason and action — the interface does not
need a model to be trilingual. They have not yet been reviewed by a native speaker, which
`docs/limitations.md` says plainly. Fonts are self-hosted Noto Sans Devanagari and Gujarati, and
the rule engine preserves ZWNJ/ZWJ so conjuncts in names are never silently rewritten.

**"What did AI build and what did you build?"**
Claude Code was the pair programmer for the whole build; the team set the scope, made every
product and design decision, approved every AWS action, filed the support case, and owns the
result. The disclosure is in `README.md`; the tools are in `ATTRIBUTIONS.md`. Within the product,
the only AI is Bedrock, and its role is the one sentence above.

**"What would you do next?"**
A thumbnail of the student's own photo beside each mark; label aliases for more state boards;
native-speaker review of the Indic copy; Bedrock on, once the quota exists. `docs/limitations.md`.

**"How do I tear it down?"**
Three commands — `sam delete`, delete the SAM artefact stack, `aws amplify delete-app`.
`docs/aws-cleanup.md`. Nothing bills while idle.
