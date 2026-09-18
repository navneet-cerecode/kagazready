import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './api/client.js';
import { ANALYSIS_ID, incomplete, needsReview, noIssues, pngFile } from './test/fixtures.js';

vi.mock('./api/client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client.js')>();
  return {
    ...actual,
    requestUpload: vi.fn(),
    uploadToS3: vi.fn(),
    createAnalysis: vi.fn(),
    getAnalysis: vi.fn(),
    replaceDocument: vi.fn(),
    deleteAnalysis: vi.fn(),
  };
});

import * as api from './api/client.js';
import App from './App.js';

const mocked = vi.mocked(api);

function wireHappyPath() {
  let uploads = 0;
  mocked.requestUpload.mockImplementation(async ({ documentType }) => {
    uploads += 1;
    return {
      analysisId: ANALYSIS_ID,
      documentType,
      objectKey: `uploads/${ANALYSIS_ID}/${documentType}/${String(uploads).padStart(16, '0')}.png`,
      upload: { url: 'https://bucket.example/', fields: { key: 'k' } },
      expiresInSeconds: 120,
    };
  });
  mocked.uploadToS3.mockImplementation(async (_p, _f, onProgress) => {
    onProgress(0.5);
    onProgress(1);
  });
  mocked.createAnalysis.mockResolvedValue(needsReview());
  mocked.replaceDocument.mockResolvedValue(noIssues());
  mocked.getAnalysis.mockImplementation(async (_id, language) => needsReview(language));
  mocked.deleteAnalysis.mockResolvedValue(undefined);
}

/** Upload one file into a slot by its accessible label. */
async function addFile(user: ReturnType<typeof userEvent.setup>, label: RegExp, file: File) {
  const input = screen.getByLabelText(label);
  await user.upload(input, file);
}

beforeEach(() => {
  vi.clearAllMocks();
  wireHappyPath();
  window.scrollTo = vi.fn();
  Object.defineProperty(navigator, 'languages', { value: ['en-IN'], configurable: true });
});

afterEach(() => {
  delete process.env.TEST_REDUCED_MOTION;
});

// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('shows the tagline, three document rows, and a disabled check button', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /check the paperwork before the portal checks you/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Class XII marksheet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income certificate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bank proof' })).toBeInTheDocument();
    expect(screen.getByTestId('check')).toBeDisabled();
  });

  it('says plainly what the product is not, without an approval word anywhere', () => {
    render(<App />);
    const text = document.body.textContent ?? '';

    expect(text).toMatch(/not a government service/i);
    expect(text).toMatch(/requirements differ between scholarships/i);
    for (const forbidden of ['approved', 'eligible', 'verified', 'guaranteed', 'rejected']) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe('upload validation', () => {
  it('rejects a PDF with a clear reason and keeps the slot empty', async () => {
    // applyAccept: false imitates a user choosing "All files" in the picker; the accept attribute
    // is a convenience, and the validation behind it is what this test is for.
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);

    await addFile(
      user,
      /choose a file for class xii marksheet/i,
      new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/jpeg or png/i);
    expect(screen.getByTestId('check')).toBeDisabled();
  });

  it('rejects a file over 5 MB', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for bank proof/i, pngFile('big.png', 6 * 1024 * 1024));

    expect(screen.getByRole('alert')).toHaveTextContent(/smaller than 5 mb/i);
  });

  it('enables the check once a valid file is added, and allows removal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for bank proof/i, pngFile('bank.png'));
    expect(screen.getByTestId('check')).toBeEnabled();
    expect(screen.getByText('bank.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByTestId('check')).toBeDisabled();
  });
});

describe('the journey', () => {
  it('uploads, shows processing without a percentage, then renders needs review with masked evidence', async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: ReturnType<typeof needsReview>) => void = () => {};
    mocked.createAnalysis.mockReturnValue(
      new Promise((resolve) => {
        resolveAnalysis = resolve;
      }),
    );
    render(<App />);

    await addFile(user, /choose a file for class xii marksheet/i, pngFile());
    await user.click(screen.getByTestId('check'));

    const processing = await screen.findByTestId('processing');
    expect(processing).toHaveTextContent(/amazon textract is reading/i);
    expect(processing.textContent).not.toMatch(/\d+%/);

    resolveAnalysis(needsReview());

    const result = await screen.findByTestId('result');
    expect(within(result).getByTestId('status-label')).toHaveTextContent('Needs review');
    expect(within(result).getAllByTestId('finding')).toHaveLength(2);
    expect(result).toHaveTextContent('XXXXXXXX7745');
    expect(result.textContent).not.toContain('304988127745');
    expect(result).toHaveTextContent(/decided by rule/i);
    expect(result).toHaveTextContent('field_unclear_low_confidence');
  });

  it('never uploads a file twice and sends the analysis with every key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for class xii marksheet/i, pngFile('m.png'));
    await addFile(user, /choose a file for bank proof/i, pngFile('b.png'));
    await user.click(screen.getByTestId('check'));
    await screen.findByTestId('result');

    expect(mocked.uploadToS3).toHaveBeenCalledTimes(2);
    expect(mocked.createAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: ANALYSIS_ID,
        documents: expect.arrayContaining([
          expect.objectContaining({ documentType: 'class_xii_marksheet' }),
          expect.objectContaining({ documentType: 'bank_proof' }),
        ]),
      }),
    );
  });

  it('renders incomplete when a required document is missing', async () => {
    mocked.createAnalysis.mockResolvedValue(incomplete());
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for class xii marksheet/i, pngFile());
    await user.click(screen.getByTestId('check'));

    const result = await screen.findByTestId('result');
    expect(within(result).getByTestId('status-label')).toHaveTextContent('Incomplete');
    expect(result).toHaveTextContent(/not uploaded: income certificate/i);
    // An incomplete result must offer a way to complete it, not just a way to delete it.
    expect(within(result).getByLabelText(/add photo: income certificate/i)).toBeInTheDocument();
    expect(within(result).getByLabelText(/add photo: bank proof/i)).toBeInTheDocument();
    // Every mark states its own status in text, not colour alone.
    expect(within(result).getAllByTestId('finding')[0]).toHaveTextContent(/missing/i);
  });

  it('replaces one document and reaches no issues found', async () => {
    process.env.TEST_REDUCED_MOTION = '1';
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for bank proof/i, pngFile('bank.png'));
    await user.click(screen.getByTestId('check'));
    await screen.findByTestId('result');

    // The replace control lives inside the mark it belongs to.
    const bankMark = screen
      .getAllByTestId('finding')
      .find((el) => /bank proof/i.test(el.textContent ?? ''));
    expect(bankMark).toBeDefined();
    await user.upload(
      within(bankMark!).getByLabelText(/replace photo: bank proof/i),
      pngFile('bank-2.png'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('status-label')).toHaveTextContent('No issues found'),
    );
    expect(screen.getByTestId('no-findings')).toBeInTheDocument();
    expect(mocked.replaceDocument).toHaveBeenCalledWith(
      expect.objectContaining({ analysisId: ANALYSIS_ID, documentType: 'bank_proof' }),
    );
    // The replacement was really uploaded, not re-used.
    expect(mocked.uploadToS3).toHaveBeenCalledTimes(2);
  });

  it('deletes after confirmation and cannot show the result again', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /choose a file for bank proof/i, pngFile());
    await user.click(screen.getByTestId('check'));
    await screen.findByTestId('result');

    await user.click(screen.getByTestId('delete'));
    await user.click(screen.getByTestId('confirm-delete'));

    await screen.findByTestId('deleted');
    expect(mocked.deleteAnalysis).toHaveBeenCalledWith(ANALYSIS_ID);
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
    expect(screen.queryByText('XXXXXXXX7745')).not.toBeInTheDocument();
  });
});

describe('explanations', () => {
  it('labels a fallback explanation as reviewed English and says a translation is unavailable in Hindi', async () => {
    mocked.createAnalysis.mockResolvedValue(needsReview('hi', 'fallback'));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'हिन्दी' }));
    await addFile(user, /बैंक प्रमाण/, pngFile());
    await user.click(screen.getByTestId('check'));

    const result = await screen.findByTestId('result');
    expect(result).toHaveTextContent('सरल शब्दों में (समीक्षित अंग्रेज़ी)');
    expect(result).toHaveTextContent(/सरल टिप्पणी अभी उपलब्ध नहीं है/);
    // The reviewed Hindi copy is still there — only the extra paragraph fell back.
    expect(result).toHaveTextContent('ध्यान देने की ज़रूरत');
  });

  it('shows a model explanation without the fallback caveat when Bedrock succeeded', async () => {
    mocked.createAnalysis.mockResolvedValue(needsReview('en', 'bedrock'));
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));

    const result = await screen.findByTestId('result');
    expect(result).toHaveTextContent('Model note for field_unclear_low_confidence');
    expect(result.textContent).not.toMatch(/reviewed english/i);
  });
});

describe('errors', () => {
  it('shows the capacity message when the daily cap is reached and returns to compose', async () => {
    mocked.createAnalysis.mockRejectedValue(
      new ApiClientError('capacity_reached', 'x', 429, 'abc123abc123abc1'),
    );
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/limit of checks for today/i);
    expect(alert).toHaveTextContent('abc123abc123abc1');
    expect(screen.getByTestId('check')).toBeEnabled();
  });

  it('shows an expiry message when the analysis is gone', async () => {
    mocked.getAnalysis.mockRejectedValue(new ApiClientError('not_found', 'x', 404));
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));
    await screen.findByTestId('result');

    await user.click(screen.getByRole('button', { name: 'ગુજરાતી' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/સમાપ્ત થઈ ગઈ/);
  });

  it('shows a network message and no internal detail', async () => {
    mocked.createAnalysis.mockRejectedValue(
      new ApiClientError('network', 'ECONNRESET at 10.0.0.1'),
    );
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not reach/i);
    expect(alert.textContent).not.toContain('10.0.0.1');
  });
});

describe('language', () => {
  it('switches the interface to Gujarati and re-fetches a result in that language', async () => {
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));
    await screen.findByTestId('result');

    await user.click(screen.getByRole('button', { name: 'ગુજરાતી' }));

    await waitFor(() => expect(mocked.getAnalysis).toHaveBeenCalledWith(ANALYSIS_ID, 'gu'));
    expect(document.documentElement.lang).toBe('gu');
  });

  it('picks Hindi from the browser preference', () => {
    Object.defineProperty(navigator, 'languages', { value: ['hi-IN', 'en'], configurable: true });
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('पोर्टल आपके');
  });
});

describe('keyboard and motion', () => {
  it('lets a keyboard user reach the language switch, the file inputs and the check button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(/how aws powers this/i);
    await user.tab();
    expect(document.activeElement).toHaveAttribute('aria-label', 'English');

    await addFile(user, /bank/i, pngFile());
    screen.getByTestId('check').focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByTestId('result')).toBeInTheDocument();
  });

  it('opens and closes the architecture drawer from the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveTextContent(/amazon textract/i);
    expect(dialog).toHaveTextContent(/cannot change a finding or a status/i);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  });

  it('with reduced motion, a new result is shown immediately with nothing held back', async () => {
    process.env.TEST_REDUCED_MOTION = '1';
    const user = userEvent.setup();
    render(<App />);

    await addFile(user, /bank/i, pngFile());
    await user.click(screen.getByTestId('check'));
    const result = await screen.findByTestId('result');

    expect(within(result).getAllByTestId('finding')).toHaveLength(2);
    expect(within(result).getByTestId('status-label')).toHaveTextContent('Needs review');
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
