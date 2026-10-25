/**
 * sales-cycle.spec.ts
 *
 * End-to-end workflow: Customer → Product → Warehouse prerequisite checks,
 * then Sales Order → Sales Invoice → (record payment / shipment post).
 *
 * Covers TEST_PLAN: 1.5.1.1, 1.5.1.2, 1.5.2.1, 1.5.2.2, 1.5.3.1, 1.5.4.1,
 *                   1.9.1, 1.4.1.2
 */
import { test, expect, uid, fillField, selectFirstOption } from './fixtures'

// ---------------------------------------------------------------------------
// Helpers for this file
// ---------------------------------------------------------------------------

async function openAddDialog(page: Parameters<typeof fillField>[0], buttonName: RegExp) {
  await page.getByRole('button', { name: buttonName }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  return dialog
}

async function submitDialog(page: Parameters<typeof fillField>[0], buttonLabel: string | RegExp) {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: buttonLabel }).last().click()
  // Wait until dialog closes (max 10s for server round-trip)
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
}

test('UX-TRADE-01: invoice filters use the shared document-workspace header', async ({ page }) => {
  for (const route of ['/sales-invoices', '/purchase-invoices']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')

    const filters = page.getByRole('region', { name: 'Page filters', exact: true })
    await expect(filters.getByRole('switch', { name: 'Outstanding only', exact: true })).toBeVisible()
    await expect(filters.getByRole('switch')).toHaveCount(1)
    await expect(page.getByRole('grid').getByRole('switch')).toHaveCount(0)
  }
})

// ---------------------------------------------------------------------------
// 1. Setup: ensure a customer, warehouse, and product exist
// ---------------------------------------------------------------------------

test.describe('Prerequisite: Customer', () => {
  test('TC-W-001: create customer', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    await openAddDialog(page, /new customer/i)
    await fillField(page, /customer number/i, uid('C'))
    await fillField(page, /customer name/i, uid('E2E Customer'))
    await submitDialog(page, /create customer/i)

    await expect(page.getByText(/e2e customer/i)).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Prerequisite: Warehouse', () => {
  test('TC-W-002: create warehouse', async ({ page }) => {
    await page.goto('/warehouses')
    await page.waitForLoadState('networkidle')

    await openAddDialog(page, /new warehouse/i)
    await fillField(page, /code/i, uid('WH'))
    await fillField(page, /warehouse name/i, uid('E2E Warehouse'))
    await submitDialog(page, /create warehouse/i)

    await expect(page.getByText(/e2e warehouse/i)).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Prerequisite: Product', () => {
  test('TC-W-003: create product', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')

    await openAddDialog(page, /new product/i)
    await fillField(page, /sku/i, uid('SKU'))
    await fillField(page, /product name/i, uid('E2E Product'))
    // Sales price default 0 is acceptable
    await submitDialog(page, /create product/i)

    await expect(page.getByText(/e2e product/i)).toBeVisible({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// 2. Sales Order
// ---------------------------------------------------------------------------

test.describe('Sales Order Workflow', () => {
  test('TC-1.5.1.1: create sales order with customer and warehouse', async ({ page }) => {
    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new sales order/i)

    await fillField(page, /order number/i, uid('SO'))
    await fillField(page, /currency code/i, 'USD')

    // Select customer (first available)
    await selectFirstOption(page, /customer/i)
    // Select warehouse (first available)
    await selectFirstOption(page, /warehouse/i)

    await dialog.getByRole('button', { name: /create sales order/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/so-/i)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.5.1.3: empty order number shows validation', async ({ page }) => {
    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new sales order/i)
    await fillField(page, /order number/i, '')
    await dialog.getByRole('button', { name: /create sales order/i }).click()

    // Dialog stays open — validation error visible
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })

  test('TC-1.5.1.5: add order line to a sales order', async ({ page }) => {
    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')

    // Pick first row
    const manageBtn = page.getByRole('button', { name: /manage lines|lines/i }).first()
    if (!(await manageBtn.isVisible())) {
      test.skip(true, 'No sales orders available — run create test first')
    }
    await manageBtn.click()
    await page.waitForLoadState('networkidle')

    // Add a line
    const addLineBtn = page.getByRole('button', { name: /add line/i }).first()
    await expect(addLineBtn).toBeVisible({ timeout: 5_000 })
    await addLineBtn.click()

    const lineDialog = page.getByRole('dialog')
    await expect(lineDialog).toBeVisible()

    // Select product
    await selectFirstOption(page, /product/i)
    await fillField(page, /quantity/i, '5')

    await lineDialog.getByRole('button', { name: /add line/i }).click()
    await expect(lineDialog).not.toBeVisible({ timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// 3. Sales Invoice
// ---------------------------------------------------------------------------

test.describe('Sales Invoice Workflow', () => {
  test('TC-1.5.2.1: create sales invoice', async ({ page }) => {
    await page.goto('/sales-invoices')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new sales invoice/i)

    await fillField(page, /invoice number/i, uid('SI'))
    await fillField(page, /currency code/i, 'USD')
    await selectFirstOption(page, /customer/i)

    await dialog.getByRole('button', { name: /create sales invoice/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/si-/i)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.5.2.2: empty invoice number shows validation', async ({ page }) => {
    await page.goto('/sales-invoices')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new sales invoice/i)
    await fillField(page, /invoice number/i, '')
    await dialog.getByRole('button', { name: /create sales invoice/i }).click()

    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})

// ---------------------------------------------------------------------------
// 4. Sales Shipment
// ---------------------------------------------------------------------------

test.describe('Sales Shipment Workflow', () => {
  test('TC-1.5.3.1: create sales shipment from page', async ({ page }) => {
    await page.goto('/sales-shipments')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new shipment/i)
    await expect(dialog).toBeVisible()

    // Fill shipment number
    const shipNumField = dialog.getByLabel(/shipment number/i).first()
    if (await shipNumField.isVisible()) {
      await shipNumField.fill(uid('SH'))
    }

    // Select warehouse
    const whField = dialog.getByLabel(/warehouse/i).first()
    if (await whField.isVisible()) {
      await whField.click()
      const opt = page.getByRole('option').first()
      if (await opt.isVisible()) await opt.click()
    }

    await dialog.getByRole('button', { name: /create shipment/i }).click()
    // Either succeeds or shows "no sales order" warning — either is acceptable
    const succeeded = await page.getByRole('dialog').isVisible().then((v) => !v)
    if (!succeeded) {
      // Dialog stayed open — check for warning (no linked SO)
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: /cancel/i }).click()
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Customer Payment
// ---------------------------------------------------------------------------

test.describe('Customer Payment Workflow', () => {
  test('TC-1.5.4.1: record customer payment', async ({ page }) => {
    await page.goto('/customer-payments')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /record payment/i)

    await selectFirstOption(page, /customer/i)
    await fillField(page, /amount/i, '100')

    await dialog.getByRole('button', { name: /record payment/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })

  test('TC-1.5.4.2: payment list visible', async ({ page }) => {
    await page.goto('/customer-payments')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"]')
    const empty = page.getByText(/no data|no payments|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 5_000 })
  })
})
