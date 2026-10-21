import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

/**
 * Playwright configuration for VexorionERP Main App (ERP) E2E tests.
 *
 * baseURL: ERP dev server on port 5173 (or override via ERP_BASE_URL)
 *
 * Usage:
 *   npx playwright test                  # run all e2e tests
 *   npx playwright test --headed         # run with browser visible
 *   npx playwright test --ui             # open Playwright UI
 *   npx playwright show-report           # open last HTML report
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: '../scripts/e2e/global-setup.mjs',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ['../scripts/e2e/lifecycle-reporter.mjs'],
    ['html', { open: 'never' }],
    ['list'],
    ...(isCI ? [['junit', { outputFile: 'test-results/playwright-ui.xml' }] as const] : []),
  ],

  use: {
    baseURL: process.env.ERP_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: process.env.ERP_BASE_URL ?? 'http://127.0.0.1:5173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
