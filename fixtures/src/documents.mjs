import { createCanvas } from '@napi-rs/canvas';

/**
 * Synthetic demo documents, drawn programmatically.
 *
 * Every fixture carries the words SYNTHETIC DEMO DOCUMENT — NOT VALID. Every identity, number and
 * institution is invented. There are no government logos, no bank branding and no seals, because
 * imitating those would be forgery practice rather than a demo.
 *
 * These are rendered to real PNGs and sent through real Amazon Textract. Nothing about the demo
 * result is hardcoded.
 */

const WIDTH = 1000;
const HEIGHT = 1400;

const INK = '#1a1a1a';
const MUTED = '#555555';
const PAPER = '#fbfaf7';
const RULE = '#d8d4cc';

const MARGIN = 80;
const LINE_HEIGHT = 46;

function newPage() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Slightly off-white, like a scanned page rather than a screenshot.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  return { canvas, ctx };
}

/** The mandatory stamp. Drawn twice: once at the top, once across the lower half. */
function drawSyntheticStamp(ctx) {
  ctx.save();
  ctx.fillStyle = '#b3261e';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SYNTHETIC DEMO DOCUMENT — NOT VALID', WIDTH / 2, 48);

  ctx.translate(WIDTH / 2, HEIGHT * 0.68);
  ctx.rotate(-Math.PI / 12);
  ctx.globalAlpha = 0.16;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('SYNTHETIC — NOT VALID', 0, 0);
  ctx.restore();
}

function drawHeader(ctx, institution, title) {
  ctx.save();
  ctx.textAlign = 'center';

  ctx.fillStyle = INK;
  ctx.font = 'bold 32px serif';
  ctx.fillText(institution, WIDTH / 2, 130);

  ctx.fillStyle = MUTED;
  ctx.font = '21px serif';
  ctx.fillText(title, WIDTH / 2, 168);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 196);
  ctx.lineTo(WIDTH - MARGIN, 196);
  ctx.stroke();
  ctx.restore();
}

/**
 * Account-number rendering quality.
 *
 * Measured against real Textract, blur and low contrast turned out to be useless as a dial: the
 * digits were read at 98-99% confidence right up to the point where the line stopped being detected
 * at all. Textract is close to bimodal on clean synthetic text, so "faint" does not mean "unsure".
 *
 * What lowers confidence is glyph *ambiguity* rather than faintness: pixelation, which destroys the
 * fine strokes that separate 3 from 8, and occluding marks that break digit outlines.
 *
 * These modes exist to be measured. The demo uses the one that genuinely lands below the template's
 * threshold while still being detected as a plausible account number — `scratched`, at about 62%.
 * Textract also misreads a digit at that quality, which is the point: a value OCR is unsure about
 * and got wrong is what the confidence rule is for. Only the last four digits are ever shown, and
 * those are read correctly.
 */
export const ACCOUNT_NUMBER_QUALITIES = [
  'clean',
  'faint',
  'pixelated-2x',
  'pixelated-3x',
  'pixelated-4x',
  'scratched',
  'pixelated-3x-scratched',
];

/**
 * Draw text through a deliberately low-resolution intermediate canvas.
 *
 * Rendering small and scaling up with smoothing disabled imitates a low-resolution photo: strokes
 * merge and digit shapes become genuinely ambiguous, which is what moves OCR confidence.
 */
function drawPixelatedText(ctx, text, x, baseline, font, factor) {
  ctx.save();
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 8;
  const height = 48;
  ctx.restore();

  const small = createCanvas(Math.ceil(width / factor), Math.ceil(height / factor));
  const smallCtx = small.getContext('2d');
  smallCtx.fillStyle = PAPER;
  smallCtx.fillRect(0, 0, small.width, small.height);
  smallCtx.fillStyle = '#2b2b2b';
  // Font size scaled down by the same factor, so the glyphs land on very few pixels.
  smallCtx.font = font.replace(
    /(\d+)px/u,
    (_m, size) => `${Math.max(6, Math.round(Number(size) / factor))}px`,
  );
  smallCtx.fillText(text, 2, height / factor - 4);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, x, baseline - height + 8, width, height);
  ctx.restore();
}

/** Occluding marks: thin paper-coloured strokes that break digit outlines. */
function drawScratches(ctx, { x, y, width, height }) {
  ctx.save();
  ctx.filter = 'none';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  for (const offset of [0.28, 0.52, 0.74]) {
    ctx.beginPath();
    ctx.moveTo(x, y + height * offset);
    ctx.lineTo(x + width, y + height * (offset - 0.12));
    ctx.stroke();
  }
  ctx.strokeStyle = '#8f8f8f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.1, y + height);
  ctx.lineTo(x + width * 0.62, y);
  ctx.stroke();
  ctx.restore();
}

/** Speckle over a region, imitating sensor noise and print mottling. */
function applyNoise(ctx, density, { x, y, width, height }) {
  if (density <= 0) return;
  ctx.save();
  ctx.filter = 'none';
  const specks = Math.floor(width * height * density * 0.06);
  for (let i = 0; i < specks; i += 1) {
    ctx.fillStyle = Math.random() < 0.5 ? PAPER : '#9a9a9a';
    ctx.fillRect(x + Math.random() * width, y + Math.random() * height, 2, 2);
  }
  ctx.restore();
}

/**
 * Draw one "Label: value" row as a single string.
 *
 * Deliberately one string rather than two columns: Textract then returns it as one LINE, which is
 * what the extractor reads. Two separately positioned strings can merge or split unpredictably.
 */
function drawRow(ctx, y, text, { font = '24px sans-serif' } = {}) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = font;
  ctx.filter = 'none';
  ctx.fillStyle = INK;
  ctx.fillText(text, MARGIN, y);
  ctx.restore();
  return y + LINE_HEIGHT;
}

/** Draw the account-number digits at the requested quality. */
function drawAccountNumber(ctx, y, digits, quality) {
  const font = 'bold 30px sans-serif';
  ctx.save();
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(digits).width);
  ctx.restore();
  const region = { x: MARGIN - 6, y: y - 34, width: width + 12, height: 44 };

  if (quality === 'clean') {
    return drawRow(ctx, y, digits, { font });
  }

  if (quality === 'faint') {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = font;
    ctx.filter = 'blur(2.2px)';
    ctx.fillStyle = '#a5a5a5';
    ctx.fillText(digits, MARGIN, y);
    ctx.restore();
    applyNoise(ctx, 0.3, region);
    return y + LINE_HEIGHT;
  }

  const pixelMatch = /^pixelated-(\d)x/u.exec(quality);
  if (pixelMatch) {
    drawPixelatedText(ctx, digits, MARGIN, y, font, Number(pixelMatch[1]));
    if (quality.endsWith('scratched')) drawScratches(ctx, region);
    return y + LINE_HEIGHT;
  }

  if (quality === 'scratched') {
    drawRow(ctx, y, digits, { font });
    drawScratches(ctx, region);
    return y + LINE_HEIGHT;
  }

  throw new Error(`unknown account number quality: ${quality}`);
}

function drawFooter(ctx, note) {
  ctx.save();
  ctx.fillStyle = MUTED;
  ctx.font = 'italic 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(note, MARGIN, HEIGHT - 70);
  ctx.restore();
}

const toPng = (canvas) => canvas.toBuffer('image/png');

// ---------------------------------------------------------------------------
// Class XII marksheet
// ---------------------------------------------------------------------------

export function renderMarksheet({ candidateName = 'Priya Rameshbhai Patel' } = {}) {
  const { canvas, ctx } = newPage();
  drawSyntheticStamp(ctx);
  drawHeader(ctx, 'Synthetic State Board of Secondary Education', 'Statement of Marks - Class XII');

  let y = 280;
  y = drawRow(ctx, y, `Candidate Name: ${candidateName}`);
  y = drawRow(ctx, y, 'Roll Number: GJ2024881234');
  y = drawRow(ctx, y, 'Year of Examination: 2024');
  y = drawRow(ctx, y, 'Board: Synthetic State Board of Secondary Education');

  y += LINE_HEIGHT;
  y = drawRow(ctx, y, 'Subject                Maximum        Obtained', {
    font: 'bold 22px sans-serif',
  });
  for (const [subject, max, got] of [
    ['English', '100', '78'],
    ['Mathematics', '100', '84'],
    ['Physics', '100', '71'],
    ['Chemistry', '100', '76'],
    ['Computer Science', '100', '89'],
  ]) {
    y = drawRow(ctx, y, `${subject.padEnd(23)}${max.padEnd(15)}${got}`, {
      font: '22px sans-serif',
    });
  }
  y = drawRow(ctx, y, 'Total                  500            398', {
    font: 'bold 22px sans-serif',
  });

  drawFooter(ctx, 'Generated for a product demonstration. Not issued by any authority.');
  return toPng(canvas);
}

// ---------------------------------------------------------------------------
// Income certificate
// ---------------------------------------------------------------------------

export function renderIncomeCertificate({
  applicantName = 'Priya Rameshbhai Patel',
  issueDate = '21/06/2026',
} = {}) {
  const { canvas, ctx } = newPage();
  drawSyntheticStamp(ctx);
  drawHeader(ctx, 'Synthetic Taluka Office', 'Income Certificate');

  let y = 280;
  y = drawRow(ctx, y, `Applicant Name: ${applicantName}`);
  y = drawRow(ctx, y, 'Guardian Name: Ramesh Kumar Patel');
  y = drawRow(ctx, y, 'Annual Income: Rs. 1,84,000');
  y = drawRow(ctx, y, `Date of Issue: ${issueDate}`);
  y = drawRow(ctx, y, 'Issuing Authority: Synthetic Taluka Office');

  y += LINE_HEIGHT;
  ctx.save();
  ctx.fillStyle = MUTED;
  ctx.font = '21px sans-serif';
  ctx.fillText('This certificate states the declared annual family income of the', MARGIN, y);
  ctx.fillText('applicant named above for the stated financial year.', MARGIN, y + 34);
  ctx.restore();

  drawFooter(ctx, 'Generated for a product demonstration. Not issued by any authority.');
  return toPng(canvas);
}

// ---------------------------------------------------------------------------
// Bank proof
// ---------------------------------------------------------------------------

/**
 * Bank passbook front page.
 *
 * The account number is laid out as a crisp label on one line with the digits on the line below.
 * That is what makes the demo's "unclear field" controllable: only the digits are degraded, so the
 * label is always found and the confidence reported is the confidence of the value itself.
 */
export function renderBankProof({
  accountHolderName = 'Priya Rameshbhai Patel',
  accountNumber = '3049 8812 7745',
  // Measured against Textract on 2026-09-18: 'SYNB0001234' read at 89.5%, a hair above the 88%
  // threshold for this field, so a bad day could turn the clean sample into "Needs review". The
  // run of zeros and the 1 were the ambiguity; this value reads at 94.6% in the same font.
  ifsc = 'SYNB0234567',
  accountNumberQuality = 'clean',
} = {}) {
  const { canvas, ctx } = newPage();
  drawSyntheticStamp(ctx);
  drawHeader(ctx, 'Synthetic State Bank', 'Savings Account Passbook - Front Page');

  let y = 280;
  y = drawRow(ctx, y, 'Bank Name: Synthetic State Bank');
  y = drawRow(ctx, y, 'Branch: Model Town (Synthetic)');
  y = drawRow(ctx, y, `Account Holder: ${accountHolderName}`);
  y = drawRow(ctx, y, 'Account Type: Savings');

  y += 12;
  y = drawRow(ctx, y, 'Account Number:');
  y = drawAccountNumber(ctx, y, accountNumber, accountNumberQuality);

  y += 12;
  y = drawRow(ctx, y, `IFSC: ${ifsc}`);
  drawRow(ctx, y, 'MICR: 000000000');

  drawFooter(ctx, 'Generated for a product demonstration. Not a real bank document.');
  return toPng(canvas);
}
