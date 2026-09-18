# Privacy

Plain statement of what KagazReady does with the documents a student uploads. It describes the
system as deployed on 2026-09-18 and is written to be checked against the code, not to reassure.

## What is collected

- Up to three document images per check: a Class XII marksheet, an income certificate, a bank
  passbook front page or equivalent bank proof. JPEG or PNG, up to 5 MB each.
- The interface language chosen (English, Hindi or Gujarati).
- Nothing else. No name, phone number, email, account, or Aadhaar number is asked for. There is no
  sign-up.

## What happens to it

1. The image goes from your browser directly to a private Amazon S3 bucket in the Mumbai
   (ap-south-1) region. The KagazReady API never receives the file itself.
2. Amazon Textract reads the text on the image. The extracted text is held in memory by the API for
   the few seconds it takes to run the checks and is then discarded. It is not saved.
3. Deterministic rules decide the result. The values shown in the result are the ones the rules
   used: names, dates, IFSC codes. A bank account number is masked to its last four digits before
   the result is saved or shown.
4. If a plain-language explanation is generated, Amazon Bedrock receives only the masked finding —
   never the document image, never the full extracted text. (At the time of writing Bedrock is not
   enabled on this deployment, so no data reaches it.)
5. The masked result is saved in Amazon DynamoDB so that switching language or replacing one
   document does not require uploading everything again.

## How long it is kept

- **Document images:** until you press **Delete**, and in any case deleted by an S3 lifecycle rule
  one day after upload — S3 applies the rule once a day at midnight UTC, so an image is gone within
  one to two days of being uploaded.
- **Results:** six hours, after which the API refuses to return them and DynamoDB removes them.
- **Logs:** seven days. Logs never contain document text; numbers are redacted before writing.
- **Delete** removes the result and every uploaded image immediately. After it, the check cannot be
  reopened.

The interface tells you when your files will be gone regardless of whether you press Delete.

## What is not done

- Documents are not shared with anyone, used to train anything by KagazReady, or kept as records.
- No cookies, no analytics, no advertising, no third-party scripts. Fonts are served from the same
  origin as the page.
- Nothing is stored in your browser between visits.
- KagazReady does not submit anything to any scholarship portal and is not connected to one.

## Where it runs and who provides it

All processing runs in Amazon Web Services, region ap-south-1 (Mumbai), in an AWS account operated
by Team DiuDaman for the WeMakeDevs × AWS hackathon. Amazon's own terms apply to the AWS services
used. One point is stated rather than hidden: some AWS AI services may, by default, store content
to improve their services unless the account owner sets an AI-services opt-out policy. This
hackathon account has not configured one. See `docs/limitations.md`.

## Your choice

The **Try the sample set** link runs the complete journey on synthetic documents, so the product
can be evaluated without uploading anything personal. If you do upload your own documents, press
**Delete** when you are done.
