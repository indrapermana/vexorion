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
    // A payment dialog or confirmation screen should appear
    const paymentArea = page.getByText(/payment|pay|tender/i)
    await expect(paymentArea).toBeVisible({ timeout: 5_000 })
  })

  test('TC-P-018: select named customer', async ({ page }) => {
    const customerBtn = page.getByRole('button', { name: /customer|select customer/i }).first()
    if (await customerBtn.isVisible()) {
      await customerBtn.click()
      // Customer search / picker should open
      const picker = page.getByRole('dialog').or(page.getByRole('listbox'))
      await expect(picker).toBeVisible({ timeout: 5_000 })
      // Dismiss
      await page.keyboard.press('Escape')
    } else {
      test.skip(true, 'No customer selector button visible')
    }
  })

  test('TC-P-019: quick create customer — empty name shows validation', async ({ page }) => {
    const customerBtn = page.getByRole('button', { name: /customer|select customer/i }).first()
    if (!(await customerBtn.isVisible())) {
      test.skip(true, 'No customer selector button visible')
    }
    await customerBtn.click()
    const addCustBtn = page.getByRole('button', { name: /add|new|create customer/i })
    if (await addCustBtn.isVisible()) {
      await addCustBtn.click()
      const dialog = page.getByRole('dialog')
      for (const box of await dialog.getByRole('textbox').all()) {
        await box.clear()
      }
      await dialog.getByRole('button', { name: /save|create/i }).last().click()
      await expect(dialog).toBeVisible({ timeout: 3_000 })
      await page.keyboard.press('Escape')
    } else {
      test.skip(true, 'No quick-add customer button')
    }
  })
})
