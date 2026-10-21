/**
 * auth.setup.ts
 *
 * Runs once before all Playwright tests (via the "setup" project).
 * Logs in via the ERP UI and saves authenticated browser storage state to
 * e2e/.auth/user.json so subsequent tests start pre-authenticated.
 */
import { test as setup, expect } from '@playwright/test'
import { AUTH_CREDENTIALS, LoginPageObject } from './fixtures'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const loginPage = new LoginPageObject(page)
  await loginPage.goto()
  const loginResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().endsWith('/api/auth/login')
  ))
  await loginPage.login(
    AUTH_CREDENTIALS.tenantCode,
    AUTH_CREDENTIALS.username,
    AUTH_CREDENTIALS.password,
  )
  const loginResponse = await loginResponsePromise

  if (!loginResponse.ok()) {
    const responseBody = await loginResponse.text()
    throw new Error(
      `E2E authentication failed with HTTP ${loginResponse.status()}: ${responseBody}. `
      + 'Verify the generated automation tenant metadata and onboarding result.',
    )
  }

  // Successful login redirects away from /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

  await page.context().storageState({ path: authFile })
})
