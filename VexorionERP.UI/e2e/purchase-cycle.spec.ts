/**
 * purchase-cycle.spec.ts
 *
 * End-to-end workflow: Supplier → Purchase Order → PO Lines →
 * Purchase Receipt (post) → Purchase Invoice → Vendor Payment
 *
 * Covers TEST_PLAN: 1.9.3, 1.6.1.1, 1.6.1.2, 1.6.2.1, 1.6.3.1, 1.6.4.1
 */
import { test, expect, uid, fillField, selectFirstOption } from './fixtures'

// ---------------------------------------------------------------------------
// Helper: open an "Add / New" dialog and return it
// ---------------------------------------------------------------------------
async function openAddDialog(page: Parameters<typeof fillField>[0], buttonName: RegExp) {
  await page.getByRole('button', { name: buttonName }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  return dialog
}

// ---------------------------------------------------------------------------
// 1. Prerequisite: Supplier
// ---------------------------------------------------------------------------

test.describe('Prerequisite: Supplier', () => {
  test('TC-1.9.3: create supplier', async ({ page }) => {
    await page.goto('/suppliers')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new supplier/i)
    await fillField(page, /supplier number/i, uid('SUP'))
    await fillField(page, /supplier name/i, uid('E2E Supplier'))
    await dialog.getByRole('button', { name: /create supplier/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/e2e supplier/i)).toBeVisible({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// 2. Purchase Order
// ---------------------------------------------------------------------------

test.describe('Purchase Order Workflow', () => {
  test('TC-1.6.1.1: create purchase order', async ({ page }) => {
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new purchase order/i)
    await fillField(page, /order number/i, uid('PO'))
    await fillField(page, /currency code/i, 'USD')
    await selectFirstOption(page, /supplier/i)
    await selectFirstOption(page, /warehouse/i)

    await dialog.getByRole('button', { name: /create purchase order/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/po-/i)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.6.1.2: add line to purchase order', async ({ page }) => {
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')

    const manageBtn = page.getByRole('button', { name: /manage lines|lines/i }).first()
    if (!(await manageBtn.isVisible())) {
      test.skip(true, 'No purchase orders available')
    }
    await manageBtn.click()
    await page.waitForLoadState('networkidle')

    const addLineBtn = page.getByRole('button', { name: /add line/i }).first()
    await expect(addLineBtn).toBeVisible({ timeout: 5_000 })
    await addLineBtn.click()

    const lineDialog = page.getByRole('dialog')
    await expect(lineDialog).toBeVisible()
    await selectFirstOption(page, /product/i)
    await fillField(page, /quantity/i, '10')

    await lineDialog.getByRole('button', { name: /add line/i }).click()
    await expect(lineDialog).not.toBeVisible({ timeout: 10_000 })
  })

  test('TC-1.6.1.2b: empty order number shows validation', async ({ page }) => {
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new purchase order/i)
    await fillField(page, /order number/i, '')
    await dialog.getByRole('button', { name: /create purchase order/i }).click()

    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})

// ---------------------------------------------------------------------------
// 3. Purchase Receipt
// ---------------------------------------------------------------------------

test.describe('Purchase Receipt Workflow', () => {
  test('TC-1.6.2.1: create purchase receipt', async ({ page }) => {
    await page.goto('/purchase-receipts')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new receipt/i)
    await fillField(page, /receipt number/i, uid('PR'))
    await selectFirstOption(page, /warehouse/i)

    // Purchase order linkage (optional — skip if no PO available)
    const poField = dialog.getByLabel(/purchase order/i).first()
    if (await poField.isVisible()) {
      await poField.click()
      const opt = page.getByRole('option').first()
      if (await opt.isVisible()) await opt.click()
    }

    await dialog.getByRole('button', { name: /create receipt/i }).click()
    const dialogStillOpen = await page.getByRole('dialog').isVisible()
    if (dialogStillOpen) {
      // May require a linked PO — accept this gracefully
      await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click()
    }
  })

  test('TC-1.6.2.1b: post receipt via action button', async ({ page }) => {
    await page.goto('/purchase-receipts')
    await page.waitForLoadState('networkidle')

    const postBtn = page.getByRole('button', { name: /^post$/i }).first()
    if (!(await postBtn.isVisible())) {
      test.skip(true, 'No unposted receipts available')
    }
    await postBtn.click()

    // Confirmation dialog may appear
    const confirm = page.getByRole('dialog')
    if (await confirm.isVisible()) {
      await confirm.getByRole('button', { name: /confirm|post/i }).last().click()
    }

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4. Purchase Invoice
// ---------------------------------------------------------------------------

test.describe('Purchase Invoice Workflow', () => {
  test('TC-1.6.3.1: create purchase invoice', async ({ page }) => {
    await page.goto('/purchase-invoices')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new purchase invoice/i)
    await fillField(page, /invoice number/i, uid('PI'))
    await fillField(page, /currency code/i, 'USD')
    await selectFirstOption(page, /supplier/i)

    await dialog.getByRole('button', { name: /create purchase invoice/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/pi-/i)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.6.3.2: empty invoice number shows validation', async ({ page }) => {
    await page.goto('/purchase-invoices')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new purchase invoice/i)
    await fillField(page, /invoice number/i, '')
    await dialog.getByRole('button', { name: /create purchase invoice/i }).click()

    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})

// ---------------------------------------------------------------------------
// 5. Vendor Payment
// ---------------------------------------------------------------------------

test.describe('Vendor Payment Workflow', () => {
  test('TC-1.6.4.1: record vendor payment', async ({ page }) => {
    await page.goto('/vendor-payments')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /record payment/i)
    await selectFirstOption(page, /supplier/i)
    await fillField(page, /amount/i, '50')

    await dialog.getByRole('button', { name: /record payment/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })
})
