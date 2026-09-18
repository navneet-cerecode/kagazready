# User research

What we know about the problem, where each piece came from, and what we do not know. Nothing here
is a statistic, an interview quote, or a testimonial, because we have none and will not invent any.

## How the problem was identified

**Official guidance.** The National Scholarship Portal (scholarships.gov.in) publishes document
requirements and instructions for post-matric scholarships, and its FAQs and institute-verification
guidance describe why applications are returned or marked defective: required documents not
attached, uploaded documents unreadable, and details that do not match between the application and
the documents — most often the applicant's name and the bank account details. Those three failure
classes are exactly the three things KagazReady checks: **missing, unreadable, inconsistent.**

**Student validation.** The team confirmed the shape of the problem with students preparing
applications: they photograph documents on a phone, they are not sure which mistakes matter, and a
returned application costs them weeks against a deadline. This validation shaped the choices below;
it was informal and is not presented as a study.

The team does not claim to have personally had a scholarship rejected.

## Who the student is (the persona the interface is built for)

- Applying for a post-matric scholarship, usually in the weeks before a portal deadline.
- On a phone, with photographs of the documents already in the camera roll.
- Reads English, Hindi or Gujarati most comfortably; the documents themselves are usually in
  English regardless.
- Anxious in a specific way: _will something in these get my application sent back?_ — not
  curious about OCR, not interested in a chatbot.

## What that changed in the product

| Observation                                           | Decision                                                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photos come from a phone, one document at a time      | One column, three ruled rows, an "Add photo" control per row; replace one document without redoing the others                                        |
| The fear is "sent back", not "is my OCR good"         | Findings lead with what to fix; the technical evidence (confidence, rule id) is present but placed after the plain words                             |
| Names get written differently on different documents  | Name comparison is Unicode-aware, order-insensitive, and separates "minor" from "material" so a spelling slip is not treated like a different person |
| An account number misread by one digit is a real risk | A higher confidence threshold (88%) for the account number than for names; the masked value shown so the student can check the last four themselves  |
| Requirements differ between scholarships              | One configurable template, and the sentence "Requirements differ between scholarships" on every screen                                               |
| The student may not trust a tool with these documents | Sample set first; delete as a first-class action; the expiry time printed on the result; no sign-up                                                  |
| Reading comfort varies                                | Hindi and Gujarati as first-class interface languages with their own fonts, not a translated afterthought                                            |
| Any hint of authority would be misleading             | No logos, no seals, no "verified"; the interface says what it is not, where the student will read it                                                 |

## What we do not know

- How real marksheets from different state boards label their fields. The template's label
  aliases cover the common English layouts; real-world coverage will need more.
- Whether "Needs review" reads as reassuring or alarming in Hindi and Gujarati to a first-time
  reader. The copy has not been reviewed by a native speaker.
- Whether students would want a saved history. The current answer is deliberately no.

## What we would do next

1. Run the sample journey with five students on their own phones and watch where they hesitate.
2. Collect (with consent, and without storing) the label layouts of real marksheets from three
   boards to extend the template.
3. Native-speaker review of the Hindi and Gujarati copy.
