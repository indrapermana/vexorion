/**
 * auth.spec.ts — TC-A-001, TC-A-003, TC-A-004 (AdminUI Authentication)
 */
import { test, expect } from '@playwright/test'
import { AUTH_CREDENTIALS, LoginPageObject } from './fixtures'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('AdminUI Authentication', () => {
  test('TC-A-001: login with valid credentials redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(
      AUTH_CREDENTIALS.tenantCode,
      AUTH_CREDENTIALS.username,
      AUTH_CREDENTIALS.password,
    )
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('TC-A-002: login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(AUTH_CREDENTIALS.tenantCode, AUTH_CREDENTIALS.username, 'WrongPass999!')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-A-003: accessing protected route without auth redirects to login', async ({ page }) => {
    await page.goto('/tenants')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('TC-A-004: logout clears session', async ({ page }) => {
    const loginPage = new LoginPageObject(page)
    await loginPage.goto()
    await loginPage.login(
      AUTH_CREDENTIALS.tenantCode,
      AUTH_CREDENTIALS.username,
      AUTH_CREDENTIALS.password,
    )
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i })
    const avatarBtn = page.getByRole('button', { name: /account|avatar|user/i }).last()

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      await avatarBtn.click()
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click()
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})
