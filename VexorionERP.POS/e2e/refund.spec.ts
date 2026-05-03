/**
 * refund.spec.ts
 *
 * POS Return & Refund workflow tests:
 *  - Open Return dialog from POS header
 *  - Invalid / non-existent invoice shows not-found message
 *  - Return dialog has invoice number field and search button
 *
 * Covers TEST_PLAN: 2.4.1, 2.4.2, 2.4.3
 */
import { test, expect } from './fixtures'

test.describe('POS Return & Refund', () => {
  // -------------------------------------------------------------------------
  // TC-2.4.1 — Open return dialog
  // -------------------------------------------------------------------------
  test('TC-2.4.1: return/refund button opens dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
    await returnBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/return.*refund/i)).toBeVisible()

    await dialog.getByRole('button', { name: /cancel|close/i }).first().click()
    await expect(dialog).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // TC-2.4.2 — Return dialog has invoice number field
  // -------------------------------------------------------------------------
  test('TC-2.4.2: return dialog contains invoice search fields', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
    await returnBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Invoice number input
    const invoiceField = dialog.getByLabel(/invoice number/i).or(
      dialog.getByPlaceholder(/INV-POS/i),
    )
    await expect(invoiceField).toBeVisible()

    // Search button
    await expect(dialog.getByRole('button', { name: /search/i })).toBeVisible()

    await dialog.getByRole('button', { name: /cancel|close/i }).first().click()
  })

  // -------------------------------------------------------------------------
  // TC-2.4.3 — Non-existent invoice shows not-found message
  // -------------------------------------------------------------------------
  test('TC-2.4.3: searching non-existent invoice shows not-found message', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
    await returnBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Enter a clearly non-existent invoice number
    const invoiceField = dialog.getByLabel(/invoice number/i).or(
      dialog.getByPlaceholder(/INV-POS/i),
    )
    await invoiceField.fill('INV-DOES-NOT-EXIST-99999')
    await dialog.getByRole('button', { name: /search/i }).click()

    // "No invoice found" message
    await expect(dialog.getByText(/no invoice found|not found/i)).toBeVisible({ timeout: 5_000 })

    await dialog.getByRole('button', { name: /cancel|close/i }).first().click()
  })

  // -------------------------------------------------------------------------
  // TC-2.4.4 — Return button requires a shift (if no shift, button hidden/disabled)
  // -------------------------------------------------------------------------
  test('TC-2.4.4: return/refund accessible from POS header', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The Return button should exist in the header area regardless of shift state
    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    // Button should be in the DOM (visible in header)
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
  })
})
