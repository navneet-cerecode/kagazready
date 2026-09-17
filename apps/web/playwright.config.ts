import { defineConfig, devices } from '@playwright/test';

/**
 * The demo journey, end to end, against the real API.
 *
 * E2E_BASE_URL selects the target: the deployed Amplify app, or (default) the local dev server,
 * which this config starts. Either way the API calls, S3 uploads and Textract reads are real, so a
 * run costs a few Textract pages and counts against the daily cap.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const isLocal = baseURL.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'reduced-motion',
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],
  webServer: isLocal
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
});
