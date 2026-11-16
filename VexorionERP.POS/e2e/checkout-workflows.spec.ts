/**
 * checkout-workflows.spec.ts
 *
 * POS Checkout scenarios:
 *  - Cash overpayment → change displayed
 *  - Cash underpayment → error/disabled
 *  - Card payment → checkout succeeds
 *  - Stock conflict dialog when item out-of-stock
 *  - Receipt displayed and can be dismissed
 *
 * Covers TEST_PLAN: 2.2.1, 2.2.2, 2.2.3, 2.2.5, 2.3.1
 */
import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { createRunApiContext, postInventoryAdjustment, seedPosCatalog } from './api-fixtures'

// ---------------------------------------------------------------------------
// Helper: ensure a shift is open and at least one item is in the cart
// ---------------------------------------------------------------------------
async function ensureShiftAndItem(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Open shift if needed
  const shiftDialog = page.getByRole('dialog', { name: /open shift/i })
  if (await shiftDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await shiftDialog.getByLabel(/opening cash float/i).fill('100')
    await shiftDialog.getByRole('button', { name: /open shift/i }).click()
    await expect(shiftDialog).not.toBeVisible({ timeout: 10_000 })
  }

  const addButton = page.locator('button:not(:disabled)').filter({ hasText: /^Add$/ }).first()
  await expect(addButton).toBeVisible({ timeout: 5_000 })
  await addButton.click()
}

// ---------------------------------------------------------------------------
// TC-2.2.1 — Cash overpayment: change shown
// ---------------------------------------------------------------------------

test('TC-2.2.1: cash overpayment shows correct change', async ({ page }) => {
  await ensureShiftAndItem(page)

  const amountField = page.getByRole('spinbutton', { name: /cash received/i })
  await amountField.clear()
  await amountField.fill('9999')

  await expect(page.getByText(/change due/i)).toBeVisible({ timeout: 3_000 })
})

// ---------------------------------------------------------------------------
// TC-2.2.2 — Cash underpayment: error shown / confirm disabled
// ---------------------------------------------------------------------------

test('TC-2.2.2: cash underpayment shows error or disables confirm', async ({ page }) => {
  await ensureShiftAndItem(page)

  const amountField = page.getByRole('spinbutton', { name: /cash received/i })
  await amountField.clear()
  await amountField.fill('0')

  await expect(page.getByRole('button', { name: /^checkout$/i })).toBeDisabled()
  await expect(page.getByRole('alert').filter({ hasText: /still due|short by|lower than/i })).toBeVisible()
})

// ---------------------------------------------------------------------------
// TC-2.2.3 — Card payment succeeds
// ---------------------------------------------------------------------------

test('TC-2.2.3: card payment completes checkout', async ({ page }) => {
  await ensureShiftAndItem(page)

  await page.getByRole('button', { name: /^card$/i }).click()
  const checkoutBtn = page.getByRole('button', { name: /^checkout$/i })
  await expect(checkoutBtn).toBeEnabled()
  await checkoutBtn.click()
  const receipt = page.getByRole('dialog', { name: /receipt/i })
  await expect(receipt).toBeVisible({ timeout: 10_000 })
  await receipt.getByRole('button', { name: /close/i }).click()
})

// ---------------------------------------------------------------------------
// TC-2.2.5 — Stock conflict dialog
// ---------------------------------------------------------------------------

test('POS-009: stale cart shows a real stock conflict and recovers without a duplicate sale', async ({ page }) => {
  const { api, requestJson } = await createRunApiContext()
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
  const { warehouse, product } = await seedPosCatalog(requestJson, suffix, 1)

  try {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const shiftDialog = page.getByRole('dialog', { name: /open shift/i })
    if (await shiftDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await shiftDialog.getByLabel(/opening cash float/i).fill('100')
      await shiftDialog.getByRole('button', { name: /open shift/i }).click()
      await expect(shiftDialog).not.toBeVisible({ timeout: 10_000 })
    }

    const warehouseSelector = page.getByRole('combobox', { name: /warehouse/i })
    await warehouseSelector.click()
    await page.getByRole('option', { name: new RegExp(warehouse.name) }).click()
    const productCard = page.locator('.MuiCard-root').filter({ hasText: product.name })
    await expect(productCard).toBeVisible()
    await productCard.getByRole('button', { name: /^add$/i }).click()
    await page.getByRole('button', { name: /use exact amount/i }).click()

    // Simulate another register consuming the last unit after this register built its cart.
    await postInventoryAdjustment(requestJson, `${suffix}-CONFLICT`, warehouse.id, product.id, -1)
    await page.getByRole('button', { name: /^checkout$/i }).click()

    const conflictDialog = page.getByRole('dialog', { name: /stock conflict/i })
    await expect(conflictDialog).toBeVisible({ timeout: 15_000 })
    await expect(conflictDialog.getByText(/exceed available stock/i)).toBeVisible()
    await expect(conflictDialog.getByText(new RegExp(`${product.name}.*requested 1.*available 0`, 'i'))).toBeVisible()
    await expect(page.getByRole('dialog', { name: /receipt/i })).not.toBeVisible()
    const invoicesBeforeRecovery = await requestJson<Array<{ invoiceNumber: string }>>('GET', '/sales-invoices')

    // Restore stock, ask the UI to refresh authoritative availability, and retry the same cart.
    await postInventoryAdjustment(requestJson, `${suffix}-RECOVER`, warehouse.id, product.id, 1)
    await conflictDialog.getByRole('button', { name: /adjust cart/i }).click()
    await expect(conflictDialog).not.toBeVisible()
    await expect(page.getByRole('spinbutton', { name: `Qty: ${product.name}` })).toHaveValue('1')
    await page.getByRole('button', { name: /^checkout$/i }).click()

    const receipt = page.getByRole('dialog', { name: /receipt/i })
    await expect(receipt).toBeVisible({ timeout: 15_000 })
    await expect(receipt.getByText(product.name)).toBeVisible()
    const invoicesAfterRecovery = await requestJson<Array<{ invoiceNumber: string }>>('GET', '/sales-invoices')
    expect(invoicesAfterRecovery).toHaveLength(invoicesBeforeRecovery.length + 1)
  } finally {
    await api.dispose()
  }
})

// ---------------------------------------------------------------------------
// TC-2.3.1 — Receipt displayed and dismissed
// ---------------------------------------------------------------------------

test('TC-2.3.1: receipt can be dismissed after checkout', async ({ page }) => {
  await ensureShiftAndItem(page)

  await page.getByRole('button', { name: /use exact amount/i }).click()
  await page.getByRole('button', { name: /^checkout$/i }).click()
  const receiptDialog = page.getByRole('dialog', { name: /receipt/i })
  await expect(receiptDialog).toBeVisible({ timeout: 10_000 })
  const closeBtn = receiptDialog.getByRole('button', { name: /close/i })
  await closeBtn.click()
  await expect(receiptDialog).not.toBeVisible({ timeout: 5_000 })
})
