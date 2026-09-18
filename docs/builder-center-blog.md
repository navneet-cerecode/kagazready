# Blog draft for AWS Builder Center

The hackathon awards its top five blogs, and the ask is specific: _the problem, the stack, what
fought back_, published on AWS Builder Center and linked in the submission. Published by the team on
2026-09-18 under their own Builder ID:
https://builder.aws.com/content/3JVSGeqFIuVHSRysXPRuzpuHtQ3/we-built-a-scholarship-paperwork-checker-in-four-days-textract-taught-us-the-most

This file is the source text of that post.

---

## We built a scholarship paperwork checker in four days. Textract taught us the most.

_Team DiuDaman · WeMakeDevs × AWS First Commit, September 2026_

### The problem

Every year, scholarship applications in India get sent back for reasons that have nothing to do
with merit: a required document missing, a passbook photo too blurry to read, a name spelt
"Priya Rameshbhai Shah" on the bank proof and "Priya Rameshbhai Patel" on the marksheet. The
National Scholarship Portal's own guidance lists these failure classes. The student finds out weeks
later, against a deadline.

We built **KagazReady** ("kagaz" is paper): upload your marksheet, income certificate and bank
proof, and it tells you what a portal would send back — before the portal does — in English, Hindi
or Gujarati. Live at https://main.d109ovvm872kui.amplifyapp.com; the "Try the sample set" link
runs the whole thing on synthetic documents.

It only ever says one of three things: **Incomplete**, **Needs review**, **No issues found**. It
never says "approved" or "verified", because it cannot know that, and we made that a rule the code
enforces.

### The stack

All serverless, all in ap-south-1, nothing that bills while idle:

- **Amplify Hosting** serves the React/Vite frontend with a strict CSP.
- **API Gateway (HTTP API)** in front of **four Lambda functions**, one per permission set — the
  function that can spend on Textract cannot delete; the one that deletes cannot call Textract.
- **S3**, private, receives uploads straight from the browser through a presigned POST that pins
  the key, the content type and the size. The API never touches file bytes.
- **Textract `DetectDocumentText`** reads each page.
- A deterministic **rule engine** (pure TypeScript, 130 tests) decides the status: name
  comparison that preserves Devanagari and Gujarati conjuncts, account-number masking, IFSC
  structure, Indian date parsing, per-field OCR-confidence thresholds.
- **Bedrock** is called _after_ the decision, to say a finding in plainer words. Its output is
  schema-validated and any decision word is rejected. If it is unavailable, reviewed English is
  used — a Bedrock failure is never an analysis failure.
- **DynamoDB** holds the masked result with a six-hour TTL; **CloudWatch** keeps redacted logs for
  seven days; **SAM** describes all of it in one template.

### What fought back

**1. Textract's confidence is almost bimodal.** We needed a demo document whose account number
Textract would genuinely read as _unclear_ (below our 88% threshold). Our first three attempts —
blur, low contrast, pixelation — did nothing: a heavily blurred number still came back at 97.9%,
and past a certain point the line simply stopped being detected. What finally worked was glyph
_ambiguity_: a scratched rendering read at 61.9%, with one digit wrong. That is exactly the case
the confidence rule exists for, so it became the fixture. We never moved the threshold to fit an
image, and a test asserts we never will.

**2. CloudFormation passes an unset parameter as an empty string.** Our config schema said
`BEDROCK_MODEL_ID` was optional — meaning _absent_. In production it arrived as `""`, the schema
threw, and two of four functions failed on every request while 176 local tests passed. Worse, our
error handler called the same config to build CORS headers, so the failure came back as API
Gateway's bare "Internal Server Error" with no correlation id. Two lessons, two regression tests.

**3. SAM's esbuild builder and npm workspaces.** SAM looks for `esbuild` inside the function's own
`node_modules`; workspaces hoist it to the root. Then SAM copies the code to a scratch directory
and runs `npm install`, which asks the public registry for our workspace packages and gets a 404.
We bundle with esbuild ourselves, write a `package.json` with `"type": "commonjs"` into each
output directory, assert the handler export loads, and let SAM zip a folder.

**4. A brand-new account has every Bedrock quota at zero.** Not a credit problem (we had USD 120
in credits, none used), not model access (that console page is retired) — the account's
"requests per minute" quotas for all 75 models were 0, and two of the three relevant ones cannot
be raised through Service Quotas. We filed a support case and shipped with Bedrock deliberately
off. Because the model was only ever decoration on a decision already made, the product lost one
optional sentence per finding and nothing else. The design survived its own worst case.

**5. A PowerShell zip is not a zip Amplify can serve.** `Compress-Archive` writes backslash entry
names; Amplify served `index.html` and 404'd every asset. Python's `zipfile` writes portable
entries; the deploy became a ten-line script anyone can run.

**6. A mocked S3 says 404; the real one said 403.** Our tests proved that a missing upload became
a polite "please upload that document again". In production it was a 500 — the function's role
had `s3:GetObject` but not `s3:ListBucket`, and without ListBucket S3 answers `HeadObject` on an
absent key with 403 so that it cannot be used to probe for keys. The fake client never knew. And
because the failed run left its record in "processing", every retry of that id answered 409 for
six hours. A read-only audit against the live URL found both in a minute. Now the role may list
its own prefix, and a failed run rolls itself back so the same id can simply try again.

### What we would tell someone starting Thursday

Decide with code and explain with words; the day your model is unavailable is the day you find out
whether your product was ever yours. Calibrate against the real service early — Textract's numbers
are not what you would guess. Test the deployed thing, not only the mocked thing — IAM changes what
"not found" even means. And write down every check you ran: ours is a `tests.json` ledger where
nothing is marked passing unless it actually ran, and "blocked" says why.

_Built with Claude Code as pair programmer; the team directed every decision and approved every
AWS action. Code and the full docs set are in the repository._
