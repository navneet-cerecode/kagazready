# Demo script

Three minutes, on the public URL, on a phone or a narrow browser window. Every step below is what
the Playwright journey (`apps/web/e2e/journey.spec.ts`) does automatically; it has passed 15 of 15
against this URL in three viewports, so the demo does not depend on luck.

**URL:** https://main.d109ovvm872kui.amplifyapp.com

## The video (what the judges actually see)

The rules: **under three minutes, uploaded to YouTube (public or unlisted), and it must show AWS —
naming it in the write-up is not enough.** There is no live demo; anything not in the video does
not count. Record the screen at phone width with the narration below, then cut in the console
shots at the marked points. Check the link opens in a signed-out browser before submitting.

Shot list:

| Time | On screen                                                                                                                  | Why                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0:00 | The compose sheet, narration of the problem                                                                                | Idea and impact                         |
| 0:30 | Sample set loads; **Check these documents**                                                                                | Execution                               |
| 0:40 | **Console cut 1:** S3 bucket → `uploads/<id>/` with three objects (~4 s)                                                   | AWS shown, not named                    |
| 0:45 | **Console cut 2:** CloudWatch → `/kagazready/kagazready/analyses` log line `analysis decided … status=needs_review` (~4 s) | Decision made by code, evidence in logs |
| 0:50 | Needs review; open both marks; masked value and rule id                                                                    | Execution, honesty                      |
| 1:25 | Language switch to हिन्दी                                                                                                  | Impact (persona), Best UI               |
| 1:40 | Replace bank proof → No issues found                                                                                       | The memorable moment                    |
| 2:05 | Delete everything → Deleted; **Console cut 3:** the S3 prefix is empty (~3 s)                                              | Privacy claim proven                    |
| 2:20 | **How AWS powers this** drawer, then **Console cut 4:** CloudFormation stack resources (~5 s)                              | Architecture (Ship It scoring)          |
| 2:40 | One sentence on what we learned (Textract confidence; empty CloudFormation parameters)                                     | Learning criterion                      |
| 2:55 | Team, track, URL on screen                                                                                                 |                                         |

Console views to have open in tabs before recording (ap-south-1): S3 → the upload bucket;
CloudWatch → Log groups → `/kagazready/kagazready/analyses`; CloudFormation → stack `kagazready`
→ Resources. Never show the account id or the Billing pages.

## 0:00 — The sheet

> "This is KagazReady. A student uploads the three documents a scholarship portal asks for, and it
> tells them — before the portal does — what would get the application sent back."

Point at the three ruled rows: marksheet, income certificate, bank proof. Point at the line under
the button: _KagazReady is a readiness check, not a government service…_

> "It only ever says one of three things: Incomplete, Needs review, or No issues found. It never
> says approved, eligible or verified, because it cannot know that."

## 0:30 — Run the sample

Tap **Try the sample set instead**. The three rows fill with synthetic documents (each one is
stamped SYNTHETIC — NOT VALID; no real person, no real bank).

Tap **Check these documents**. While it runs (5–8 seconds):

> "The photos went straight from the browser to a private S3 bucket under a presigned policy — the
> API never sees the bytes. Textract reads the text. Then deterministic rules decide."

## 0:50 — Needs review

The status token reads **Needs review**. "What to fix — 2."

Open the first mark: **Hard to read: account number.**

> "Here is the evidence: it read `XXXXXXXX7745` at 63% confidence, and this check needs 88%. The
> number is masked before it is stored or shown. The rule that decided this is named at the
> bottom — `field_unclear_low_confidence`. No model made that decision."

Open the second: **The name does not match between documents.** Show the three readings:
_Priya Rameshbhai Shah_ on the bank proof, _Priya Rameshbhai Patel_ on the other two.

> "Same first name, same middle name, different surname — that is a material difference, and it is
> the single most common reason a portal returns an application."

Optional, 10 seconds: switch the language to हिन्दी or ગુજરાતી. Everything changes, including the
finding text, because the copy is reviewed and static — it does not need a model.

## 1:40 — Fix it

Tap **Use the corrected sample bank proof** (in real use this is **Replace photo: Bank proof** on
the mark itself). The marks withdraw. The status token reads **No issues found**.

> "Same sheet, no marks. There is no percentage and no celebration, because none would be honest.
> It says what it found, and it stops."

## 2:10 — Delete

Scroll to **Finished?** Tap **Delete everything**, confirm.

> "That removed the result and every uploaded object immediately. Even if nobody pressed this, the
> files expire within a day or two and the result within six hours."

## 2:30 — How AWS powers this

Tap **How AWS powers this** in the footer. The drawer lists the six steps: S3 → Lambda → Textract →
deterministic rules → Bedrock → DynamoDB.

> "Bedrock's only job is to say a finding in plainer words, after the decision is final. Today it is
> deployed off — this new account's Bedrock quotas are zero and a support case is open — and what
> you saw is exactly the fallback the design calls for: reviewed English, labelled as such."

## If something goes wrong

- **Check button disabled:** no document attached yet. Tap the sample link first.
- **"This demo has reached its limit of checks for today":** the daily cap (150) has been hit. It resets at midnight UTC; the cap
  exists to protect the credit budget.
- **Network error:** the API and S3 are in ap-south-1; a corporate proxy that blocks
  `*.amazonaws.com` will stop uploads. Use a phone on mobile data.
- **Result looks stale after switching language:** it re-fetches; wait a second.

## Things not to say

Do not say "verified", "approved", "eligible", "guaranteed" or "rejected". Do not say the team had
an application rejected. Do not say KagazReady is connected to the National Scholarship Portal.
