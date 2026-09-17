import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { renderBankProof, renderIncomeCertificate, renderMarksheet } from './documents.mjs';

/**
 * Writes the synthetic demo documents used by the sample journey.
 *
 * Usage:
 *   node src/generate.mjs [outputDir]      (default: ./out)
 *
 * The sample journey uploads these through the real presigned S3 path and analyses them with real
 * Textract. No result is hardcoded anywhere: the findings the demo shows are produced by running
 * these images through the same pipeline a user's own photographs go through.
 *
 * `bank-proof-needs-review.png` is the one deliberately damaged file. Its account number is drawn
 * with occluding marks, measured at roughly 62% Textract confidence against an 88% threshold — see
 * `textract.live.test.ts` for the measurements and for why that quality was chosen over blur.
 */

const NAME_ON_MOST_DOCUMENTS = 'Priya Rameshbhai Patel';
/** Different surname, to create the cross-document mismatch the demo opens with. */
const NAME_ON_BANK_PROOF = 'Priya Rameshbhai Shah';

const FILES = [
  {
    name: 'marksheet.png',
    note: 'Class XII marksheet. Consistent name, everything legible.',
    render: () => renderMarksheet({ candidateName: NAME_ON_MOST_DOCUMENTS }),
  },
  {
    name: 'income-certificate.png',
    note: 'Income certificate. Consistent name, unambiguous issue date.',
    render: () => renderIncomeCertificate({ applicantName: NAME_ON_MOST_DOCUMENTS }),
  },
  {
    name: 'bank-proof-needs-review.png',
    note: 'Bank proof with two real problems: a different surname and a damaged account number.',
    render: () =>
      renderBankProof({
        accountHolderName: NAME_ON_BANK_PROOF,
        accountNumberQuality: 'scratched',
      }),
  },
  {
    name: 'bank-proof-corrected.png',
    note: 'The replacement bank proof. Matching name, clearly printed account number.',
    render: () => renderBankProof({ accountHolderName: NAME_ON_MOST_DOCUMENTS }),
  },
];

const outputDir = resolve(process.argv[2] ?? 'out');
await mkdir(outputDir, { recursive: true });

for (const file of FILES) {
  const png = file.render();
  await writeFile(join(outputDir, file.name), png);
  process.stdout.write(
    `${file.name.padEnd(32)} ${(png.length / 1024).toFixed(0)} kB  ${file.note}\n`,
  );
}

process.stdout.write(`\nWritten to ${outputDir}\n`);
