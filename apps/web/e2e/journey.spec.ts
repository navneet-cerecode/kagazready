import { expect, test, type Page } from '@playwright/test';

/**
 * The critical demo journey, exactly as a judge would drive it, against the real backend:
 *
 *   load -> try the sample set -> real S3 upload -> real Textract -> Needs review with masked
 *   evidence -> replace the bank proof -> No issues found -> delete -> cannot be reopened.
 */

const API_BASE =
  process.env.E2E_API_BASE_URL ?? 'https://qev138fuyk.execute-api.ap-south-1.amazonaws.com/prod';

/** The analysis id is only observable through the network; capture it from the first API call. */
async function captureAnalysisId(page: Page): Promise<() => string> {
  let analysisId = '';
  page.on('request', (request) => {
    const match = /\/analyses\/([0-9a-f]{32})/u.exec(request.url());
    if (match?.[1]) analysisId = match[1];
    if (request.method() === 'POST' && request.url().endsWith('/analyses')) {
      const body = request.postDataJSON() as { analysisId?: string } | null;
      if (body?.analysisId) analysisId = body.analysisId;
    }
  });
  return () => analysisId;
}

test('the sample journey reaches No issues found and is then deleted', async ({
  page,
  request,
}) => {
  const analysisId = await captureAnalysisId(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check the paperwork');

  // 1. The sample set loads into the three rows.
  await page.getByTestId('try-sample').click();
  await expect(page.getByText('marksheet.png')).toBeVisible();
  await expect(page.getByText('income-certificate.png')).toBeVisible();
  await expect(page.getByText('bank-proof.png')).toBeVisible();

  // 2. Real upload, real Textract.
  await page.getByTestId('check').click();
  const result = page.getByTestId('result');
  await expect(result).toBeVisible({ timeout: 60_000 });

  // 3. Needs review, with exactly the two expected marks and masked evidence.
  await expect(page.getByTestId('status-label')).toHaveText('Needs review');
  await expect(page.getByTestId('finding')).toHaveCount(2);
  await expect(result).toContainText('Hard to read: account number');
  await expect(result).toContainText('The name does not match between documents');
  await expect(result).toContainText('XXXXXXXX7745');
  await expect(result).not.toContainText('304988127745');
  await expect(result).not.toContainText('3049 8812 7745');
  await expect(result).toContainText('Priya Rameshbhai Shah');
  await expect(result).toContainText('Decided by rule');

  // No approval language anywhere on the page.
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const word of ['approved', 'eligible', 'verified', 'guaranteed', 'rejected']) {
    expect(text, `page must not contain "${word}"`).not.toContain(word);
  }

  // 4. Replace the problem document with the corrected sample, re-run.
  await page.getByTestId('use-corrected-sample').click();
  await expect(page.getByTestId('status-label')).toHaveText('No issues found', { timeout: 60_000 });
  await expect(page.getByTestId('finding')).toHaveCount(0);
  await expect(page.getByTestId('no-findings')).toBeVisible();

  // 5. Delete, with confirmation.
  const id = analysisId();
  expect(id, 'an analysis id should have been observed').toMatch(/^[0-9a-f]{32}$/);

  await page.getByTestId('delete').click();
  await page.getByTestId('confirm-delete').click();
  await expect(page.getByTestId('deleted')).toBeVisible();
  await expect(page.getByTestId('result')).toHaveCount(0);

  // 6. It cannot be reopened: the API says it is gone.
  const gone = await request.get(`${API_BASE}/analyses/${id}`);
  expect(gone.status()).toBe(404);
  const body = (await gone.json()) as { error: { code: string } };
  expect(body.error.code).toBe('not_found');
});

test('a wrong file type is refused before any upload', async ({ page }) => {
  await page.goto('/');

  const input = page.getByLabel(/choose a file for bank proof/i);
  await input.setInputFiles({
    name: 'not-an-image.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });

  await expect(page.getByRole('alert')).toContainText('JPEG or PNG');
  await expect(page.getByTestId('check')).toBeDisabled();
});

test('keyboard focus is visible on the file controls', async ({ page }) => {
  await page.goto('/');

  // The file input is visually hidden; its label must carry the ring when the input has focus.
  const input = page.getByLabel(/choose a file for class xii marksheet/i);
  await input.focus();
  await expect(input).toBeFocused();

  const outline = await input.evaluate((element) => {
    const label = document.querySelector(`label[for="${element.id}"]`);
    return label ? getComputedStyle(label).outlineStyle : 'no-label';
  });
  expect(outline).toBe('solid');
});

test('the interface switches to Hindi and Gujarati', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'हिन्दी' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('पोर्टल');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');

  await page.getByRole('button', { name: 'ગુજરાતી' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('પોર્ટલ');
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu');
});

test('the architecture drawer explains the boundary', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'How AWS powers this' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Amazon Textract');
  await expect(dialog).toContainText('cannot change a finding or a status');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('no layout shift or console errors during the first render', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!shift.hadRecentInput) total += shift.value ?? 0;
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(total);
        }, 1500);
      }),
  );

  expect(errors, 'console errors').toEqual([]);
  expect(cls, 'cumulative layout shift').toBeLessThan(0.1);
});
