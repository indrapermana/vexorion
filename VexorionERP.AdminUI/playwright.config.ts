import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for VexorionERP AdminUI E2E tests.
 *
 * baseURL: AdminUI dev server on port 5174 (or override via ADMIN_BASE_URL)
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
    baseURL: process.env.ADMIN_BASE_URL ?? 'http://localhost:5174',
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
