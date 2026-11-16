/**
 * customer.spec.ts — POS customer selection scenarios
 * TC-P-017 to TC-P-020
 */
import { test, expect } from './fixtures'

test.describe('POS Customer Selection', () => {
  test.beforeEach(async ({ posPage }) => {
    await posPage.goto()
    await posPage.openShift(100)
  })

  test('TC-P-017: guest checkout proceeds without selecting customer', async ({
    page,
    posPage,
  }) => {
    await posPage.addProductToCart()
    await posPage.checkout()
    await expect(page.getByRole('dialog', { name: /receipt/i })).toBeVisible({ timeout: 10_000 })
  })

  test('TC-P-018: select named customer', async ({ page }) => {
    const customerSelect = page.getByRole('combobox', { name: /customer/i })
    await expect(customerSelect).toBeVisible()
    await customerSelect.click()
    const customerOption = page.getByRole('option').filter({ hasNotText: /^Guest$/i }).first()
    const customerName = (await customerOption.textContent())?.trim() ?? ''
    await customerOption.click()
    await expect(customerSelect).toContainText(customerName)
  })

  test('TC-P-019: quick create customer — empty name shows validation', async ({ page }) => {
    await page.getByRole('button', { name: /quick customer/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^create$/i }).click()
    await expect(dialog.getByText(/enter a customer name/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})
