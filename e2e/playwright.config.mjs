import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { ARTIFACTS_DIR } from './lib/config.mjs';

// E2E_BASE_URL runs the specs against a stack you started yourself (global setup then
// starts nothing). Without it the stack is started and stopped by global-setup.mjs.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './specs',
  outputDir: path.join(ARTIFACTS_DIR, 'results'),
  globalSetup: './global-setup.mjs',
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS || 4),
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(ARTIFACTS_DIR, 'report'), open: 'never' }],
  ],
  use: {
    baseURL: external,
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'off',
    launchOptions: {
      // Point at an existing Chromium instead of the one Playwright downloads.
      executablePath: process.env.E2E_CHROMIUM || undefined,
    },
  },
});
