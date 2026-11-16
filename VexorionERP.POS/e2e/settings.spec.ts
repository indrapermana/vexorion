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
    await page.getByRole('button', { name: /more register actions/i }).click()
    const themeBtn = page.getByRole('button', { name: /theme.*dark|theme.*light/i })
    await expect(themeBtn).toBeVisible()
    const before = await themeBtn.getAttribute('aria-label')

    await themeBtn.click()
    await expect(themeBtn).not.toHaveAttribute('aria-label', before ?? '')
  })

  test('TC-P-022: language switch changes UI language', async ({ page }) => {
    await page.getByRole('button', { name: /more register actions/i }).click()
    const languageSelect = page.getByRole('combobox', { name: /language/i })
    await languageSelect.click()
    await page.getByRole('option', { name: 'ID', exact: true }).click()
    await expect(page.getByRole('combobox', { name: /bahasa/i })).toContainText('ID')
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
