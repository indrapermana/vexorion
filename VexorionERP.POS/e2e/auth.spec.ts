/**
 * auth.spec.ts — POS authentication scenarios
 * TC-P-001, TC-P-002 (wrong password, unauthenticated redirect)
 */
import { test, expect } from '@playwright/test'
import { AUTH_CREDENTIALS, LoginPageObject } from './fixtures'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('POS Authentication', () => {
  test('TC-P-001: login with valid credentials redirects to POS', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(
      AUTH_CREDENTIALS.tenantCode,
      AUTH_CREDENTIALS.username,
      AUTH_CREDENTIALS.password,
    )
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('TC-P-002: login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(AUTH_CREDENTIALS.tenantCode, AUTH_CREDENTIALS.username, 'WrongPass999!')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-P-003: accessing POS without auth redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})
