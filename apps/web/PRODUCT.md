# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An Indian student preparing a post-matric scholarship application. Most often on a phone, in a
hurry, with photographs of the documents already taken. The job is narrow and anxious: _will
something in these documents get my application sent back?_ Confirmed by the team on 2026-09-18.

Language matters. The student may read English, Hindi or Gujarati most comfortably, and the
documents themselves are usually in English regardless.

## Product Purpose

KagazReady checks scholarship documents for missing, unreadable, or inconsistent details **before**
final submission. The student uploads a Class XII marksheet, an income certificate and a bank proof.
Amazon Textract reads the text, deterministic rules identify problems, and the product returns an
evidence-backed correction checklist.

Success is a student fixing a real problem — a mismatched name, an unreadable account number — before
a portal or a reviewer finds it, in a language they read comfortably, without handing their documents
to anyone.

Tagline: _Check the paperwork before the portal checks you._

## Positioning

A **document-readiness assistant**, and nothing more. The mechanism a neighbouring product could not
truthfully copy: every status and finding is decided by inspectable, deterministic rules, and the
product can say exactly which rule fired and show the masked evidence. The language model is used
only to restate a decision already made, never to make one.

The product is **not** a government service, is not affiliated with the National Scholarship Portal,
is not an eligibility evaluator, is not a document-authenticity service, does not submit
applications, does not guarantee approval, and is not a chatbot. Every one of those is a claim the
interface must actively avoid implying.

## Operating Context

- Three document types per check: Class XII marksheet, income certificate, bank passbook front page
  or equivalent bank proof. JPEG or PNG, 5 MB each, single page.
- The student's own phone photos are the normal input; a "try a sample" journey exists so the product
  can be understood without uploading anything personal.
- Requirements differ between scholarships. The product runs one configurable template and must say
  plainly that the checklist is not universal.
- Uploads are private and short-lived: deleted on request, and automatically within a day.

## Capabilities and Constraints

- Statuses are exactly three: **Incomplete**, **Needs review**, **No issues found**. The words
  approved, eligible, verified, guaranteed and rejected never appear anywhere in the product.
- Each finding shows: status, title, which document, masked evidence, reason, suggested action, OCR
  confidence when relevant, the rule identifier, and that it was decided deterministically.
- Bank account numbers are always masked to the last four digits.
- Plain-language explanations (Bedrock) are optional and may be unavailable; when they are, the
  interface says the simplified explanation is unavailable in that language and shows reviewed
  English instead. Everything else is fully localised without any model.
- Aadhaar is never collected or asked for.
- No accounts, no history, no admin: one check at a time, then delete.
- Motion: GSAP only; must respect reduced-motion; no fake progress percentages.

## Brand Commitments

- Name: **KagazReady**. Team: **DiuDaman**.
- No logo exists and none should be invented; the wordmark is typographic only (confirmed
  2026-09-18).
- Voice: precise, calm, plain. It tells the student what was found and what to do, and stops. It
  does not reassure with promises it cannot keep.
- Never claim the team personally experienced scholarship rejection.

## Evidence on Hand

- Synthetic demo documents in `fixtures/`, every one stamped SYNTHETIC DEMO DOCUMENT — NOT VALID,
  with invented identities and no institutional branding. These are the only document images the
  product ships.
- Real Amazon Textract measurements in `fixtures/out/calibration.txt`.
- The problem is presented as identified through official scholarship guidance and student
  validation. **There are no user statistics, interview quotes, testimonials or success counts, and
  none may be fabricated.**

## Product Principles

1. **Decide with rules, explain with words.** Status comes from code the team can read and test. Any
   sentence a model writes is decoration on a decision already made.
2. **Show the evidence, masked.** A finding without the text it was based on is an opinion. A
   finding that reveals a full account number is a leak.
3. **Say what it is not.** The interface carries its own disclaimers where the student will actually
   read them, not in a footer nobody opens.
4. **The phone is the desk.** One column, large touch targets, legible numerals, and Devanagari and
   Gujarati that render correctly are not nice-to-haves.
5. **Nothing outlives the check.** Delete is a first-class action, and the interface tells the
   student when their files will be gone regardless.

## Accessibility & Inclusion

- Whole journey operable by keyboard with visible focus.
- `prefers-reduced-motion` yields an immediate, complete interface with nothing hidden behind
  animation.
- Hindi and Gujarati are first-class interface languages, not translated afterthoughts; fonts must
  render conjuncts and matras correctly.
- Status is never conveyed by colour alone.
