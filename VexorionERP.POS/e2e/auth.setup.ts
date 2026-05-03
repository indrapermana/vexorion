/**
 * auth.setup.ts
 *
 * Runs once before all Playwright tests (via the "setup" project in playwright.config.ts).
 * Logs in via the UI and saves the authenticated browser storage state to
 * e2e/.auth/user.json so all subsequent tests start pre-authenticated.
 *
 * Run:  npx playwright test --project=setup
 */
import { test as setup, expect } from '@playwright/test'
import { AUTH_CREDENTIALS, LoginPageObject } from './fixtures'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const loginPage = new LoginPageObject(page)
  await loginPage.goto()
  await loginPage.login(
    AUTH_CREDENTIALS.tenantCode,
    AUTH_CREDENTIALS.username,
    AUTH_CREDENTIALS.password,
  )

  // Wait until we are redirected away from /login (successful auth redirects to /)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

  // Persist storage state (cookies + localStorage) so the "chromium" project
  // can reuse it without re-authenticating.
  await page.context().storageState({ path: authFile })
})
