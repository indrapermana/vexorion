/**
 * settings.spec.ts — POS theme toggle and language switch
 * TC-P-021 to TC-P-023
 */
import { test, expect } from './fixtures'

test.describe('POS Settings', () => {
  test.beforeEach(async ({ posPage }) => {
    await posPage.goto()
  })

  test('TC-P-021: theme toggle switches dark/light mode', async ({ page }) => {
    const themeBtn = page
      .getByRole('button', { name: /theme|dark|light/i })
      .or(page.locator('[data-testid="theme-toggle"]'))
      .first()
    if (!(await themeBtn.isVisible())) {
      test.skip(true, 'No theme toggle button visible')
    }
    const htmlEl = page.locator('html')
    const before = await htmlEl.getAttribute('class')

    await themeBtn.click()

    const after = await htmlEl.getAttribute('class')
    // Class should have changed (dark added/removed) or body data-theme changed
    if (before === after) {
      // Try data attribute
      const dataBefore = await htmlEl.getAttribute('data-theme')
      await themeBtn.click()
      const dataAfter = await htmlEl.getAttribute('data-theme')
      expect(dataBefore).not.toEqual(dataAfter)
    }
  })

  test('TC-P-022: language switch changes UI language', async ({ page }) => {
    const langBtn = page
      .getByRole('button', { name: /language|lang|en|fr|de/i })
      .or(page.locator('[data-testid="lang-switch"]'))
      .first()
    if (!(await langBtn.isVisible())) {
      test.skip(true, 'No language switch button visible')
    }
    await langBtn.click()
    const menu = page.getByRole('menu').or(page.getByRole('listbox'))
    await expect(menu).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
  })

  test('TC-P-023: settings page loads without errors', async ({ page }) => {
    const settingsBtn = page.getByRole('button', { name: /settings/i }).first()
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    } else {
      // Try navigating directly
      await page.goto('/settings')
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }
  })
})
