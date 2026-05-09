import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

/**
 * Playwright configuration for VexorionERP POS E2E tests.
 *
 * - baseURL: POS dev server on port 5175 (or override via POS_BASE_URL env var)
 * - Run `npm run dev` in the POS project before running E2E tests, or set
 *   `webServer` to auto-start it.
 *
 * Usage:
 *   npx playwright test                  # run all e2e tests
 *   npx playwright test --headed         # run with browser visible
 *   npx playwright test --ui             # open Playwright UI
 *   npx playwright show-report           # open last HTML report
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(isCI ? [['junit', { outputFile: 'test-results/playwright-pos.xml' }] as const] : []),
  ],

  use: {
    baseURL: process.env.POS_BASE_URL ?? 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project runs first to create the authenticated state file
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main tests depend on setup completing first
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
    command: 'npm run dev -- --host 127.0.0.1 --port 5175',
    url: process.env.POS_BASE_URL ?? 'http://127.0.0.1:5175',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
