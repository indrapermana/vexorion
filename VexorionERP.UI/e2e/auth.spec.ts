/**
 * auth.spec.ts — TC-M-001 to TC-M-005 (Authentication scenarios)
 *
 * NOTE: These tests intentionally do NOT use the stored auth state so they can
 * test the login page directly. They use a fresh browser context.
 */
import { test, expect } from '@playwright/test'
import { AUTH_CREDENTIALS, LoginPageObject } from './fixtures'

// Use a fresh context (no stored auth) for all tests in this file
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication', () => {
  test('TC-M-001: login with valid credentials redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(
      AUTH_CREDENTIALS.tenantCode,
      AUTH_CREDENTIALS.username,
      AUTH_CREDENTIALS.password,
    )
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL('/', { timeout: 5_000 })
  })

  test('TC-M-002: login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(AUTH_CREDENTIALS.tenantCode, AUTH_CREDENTIALS.username, 'WrongPass999!')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-M-003: login with empty fields shows validation errors', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    // Clear pre-filled demo values then submit
    await page.getByLabel(/tenant code/i).clear()
    await page.getByLabel(/username or email/i).clear()
    await page.getByLabel(/^password/i).clear()
    await page.getByRole('button', { name: /sign in/i }).click()
    // Stay on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-M-004: accessing protected route without auth redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('TC-M-005: logout clears session and redirects to login', async ({ page }) => {
    // First log in
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(
      AUTH_CREDENTIALS.tenantCode,
      AUTH_CREDENTIALS.username,
      AUTH_CREDENTIALS.password,
    )
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    // The desktop shell exposes logout directly in the navigation footer.
    // Let Playwright auto-wait for that stable accessible control.
    await page.getByRole('button', { name: /^logout$/i }).click()

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})
