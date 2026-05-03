import { defineConfig, devices } from '@playwright/test'

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
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

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
})
