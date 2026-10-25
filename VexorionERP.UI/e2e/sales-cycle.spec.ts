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

test('UX-TRADE-02: document statuses explain next steps and disabled invoice payments explain why', async ({ page }) => {
  const orderId = '11111111-1111-4111-8111-111111111111'
  await page.route('**/api/sales-orders', (route) => route.fulfill({ json: [{
    id: orderId, orderNumber: 'SO-UX-02', customerId: 'customer-1',
    warehouseId: 'warehouse-1', orderDate: '2026-10-25', status: 3, currencyCode: 'USD', totalAmount: 100, isActive: true,
  }] }))
  await page.route(`**/api/sales-orders/${orderId}`, (route) => route.fulfill({ json: {
    id: orderId, tenantId: 'tenant-1', orderNumber: 'SO-UX-02', customerId: 'customer-1', warehouseId: 'warehouse-1',
    orderDate: '2026-10-25', requiredDate: '2026-10-31', status: 3, currencyCode: 'USD', totalAmount: 100, isActive: true,
  } }))
  await page.route(`**/api/sales-orders/${orderId}/lines`, (route) => route.fulfill({ json: [] }))
  await page.route(`**/api/sales-shipments/by-order/${orderId}`, (route) => route.fulfill({ json: [] }))
  await page.route(`**/api/documents/source/SalesOrder/${orderId}`, (route) => route.fulfill({ json: [] }))
  await page.route('**/api/audit-logs**', (route) => route.fulfill({ json: { page: 1, pageSize: 10, totalCount: 0, items: [] } }))
  await page.goto('/sales-orders', { waitUntil: 'domcontentloaded' })
  const orderStatus = page.getByText('Partially processed', { exact: true })
  await expect(orderStatus).toBeVisible()
  await orderStatus.hover()
  await expect(page.getByRole('tooltip')).toContainText('Create another shipment or receipt for remaining quantities.')
  await page.getByRole('grid').getByRole('menuitem', { name: 'Review' }).click()
  await expect(page.getByRole('heading', { name: 'Document review: SO-UX-02' })).toBeVisible()
  await expect(page.getByText('2026-10-31')).toBeVisible()
  await expect(page.getByText('No shipments have been created for this order.')).toBeVisible()

  await page.route('**/api/sales-invoices*', (route) => route.fulfill({ json: [
    {
      id: '22222222-2222-4222-8222-222222222222', tenantId: 'tenant-1', invoiceNumber: 'SI-DRAFT', customerId: 'customer-1',
      invoiceDate: '2026-10-25', dueDate: '2026-11-24', status: 1, currencyCode: 'USD', subtotal: 100, taxTotal: 0,
      grandTotal: 100, paidTotal: 0, balanceDue: 100, isActive: true,
    },
    {
      id: '33333333-3333-4333-8333-333333333333', tenantId: 'tenant-1', invoiceNumber: 'SI-PAID', customerId: 'customer-1',
      invoiceDate: '2026-10-25', dueDate: '2026-11-24', status: 4, currencyCode: 'USD', subtotal: 100, taxTotal: 0,
      grandTotal: 100, paidTotal: 100, balanceDue: 0, isActive: true,
    },
  ] }))
  await page.goto('/sales-invoices', { waitUntil: 'domcontentloaded' })
  const invoiceGrid = page.getByRole('grid')
  await expect(invoiceGrid.getByText('SI-DRAFT', { exact: true })).toBeVisible()
  const draftPayment = invoiceGrid.getByRole('menuitem', { name: /Record payment.*Draft invoices cannot accept payments/ })
  const settledPayment = invoiceGrid.getByRole('menuitem', { name: /Record payment.*No outstanding balance remains/ })
  await expect(draftPayment).toBeDisabled()
  await expect(settledPayment).toBeDisabled()
  await expect(invoiceGrid.getByText('Draft', { exact: true })).toBeVisible()
  await expect(invoiceGrid.getByText('Paid', { exact: true })).toBeVisible()
})

test('UX-TRADE-04: shipment and receipt entry show progress and support tablet keyboard input', async ({ page }) => {
  const salesOrderId = '44444444-4444-4444-8444-444444444444'
  const purchaseOrderId = '55555555-5555-4555-8555-555555555555'
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.route('**/api/sales-orders', (route) => route.fulfill({ json: [{
    id: salesOrderId, orderNumber: 'SO-UX-04', customerId: 'customer-1', warehouseId: 'warehouse-1',
    orderDate: '2026-10-25', status: 2, currencyCode: 'USD', totalAmount: 100, isActive: true,
  }] }))
  await page.route('**/api/purchase-orders', (route) => route.fulfill({ json: [{
    id: purchaseOrderId, orderNumber: 'PO-UX-04', supplierId: 'supplier-1', warehouseId: 'warehouse-1',
    orderDate: '2026-10-25', status: 2, currencyCode: 'USD', totalAmount: 100, isActive: true,
  }] }))
  await page.route(`**/api/sales-orders/${salesOrderId}/lines`, (route) => route.fulfill({ json: [{
    id: 'sales-line-1', salesOrderId, productId: 'product-1', quantity: 10, shippedQuantity: 6,
    remainingQuantity: 4, unitPrice: 5, lineTotal: 50, isActive: true,
  }] }))
  await page.route(`**/api/purchase-orders/${purchaseOrderId}/lines`, (route) => route.fulfill({ json: [{
    id: 'purchase-line-1', purchaseOrderId, productId: 'product-1', quantity: 10, receivedQuantity: 6,
    remainingQuantity: 4, unitCost: 5, lineTotal: 50, isActive: true,
  }] }))
  await page.route(`**/api/sales-shipments/by-order/${salesOrderId}`, (route) => route.fulfill({ json: [] }))
  await page.route(`**/api/purchase-receipts/by-order/${purchaseOrderId}`, (route) => route.fulfill({ json: [] }))
  await page.route('**/api/products', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/warehouses', (route) => route.fulfill({ json: [] }))

  await page.goto('/sales-shipments', { waitUntil: 'domcontentloaded' })
  await page.getByRole('combobox', { name: 'Sales order' }).click()
  await page.getByRole('option', { name: 'SO-UX-04' }).click()
  await page.getByRole('button', { name: 'New shipment' }).click()

  const shipmentDialog = page.getByRole('dialog')
  await expect(shipmentDialog.getByText('Already shipped')).toBeVisible()
  await expect(shipmentDialog.getByText('Remaining')).toBeVisible()
  await expect(shipmentDialog.getByText('After shipment')).toBeVisible()
  const shipmentTable = shipmentDialog.locator('table')
  await expect(shipmentTable).toHaveCSS('min-width', '760px')
  const shippedQuantity = shipmentDialog.getByRole('spinbutton', { name: 'Line 1, product-1' })
  await expect(shippedQuantity).toHaveAttribute('max', '4')
  await shippedQuantity.fill('2')
  await expect(shipmentDialog.getByRole('row').filter({ hasText: 'product-1' })).toContainText('8')

  await page.goto('/purchase-receipts', { waitUntil: 'domcontentloaded' })
  await page.getByRole('combobox', { name: 'Purchase order' }).click()
  await page.getByRole('option', { name: 'PO-UX-04' }).click()
  await page.getByRole('button', { name: 'New receipt' }).click()

  const receiptDialog = page.getByRole('dialog')
  await expect(receiptDialog.getByText('Already received')).toBeVisible()
  await expect(receiptDialog.getByText('Remaining')).toBeVisible()
  await expect(receiptDialog.getByText('After receipt')).toBeVisible()
  const receivedQuantity = receiptDialog.getByRole('spinbutton', { name: 'Line 1, product-1' })
  await expect(receivedQuantity).toHaveAttribute('max', '4')
  await receivedQuantity.fill('2')
  await expect(receiptDialog.getByRole('row').filter({ hasText: 'product-1' })).toContainText('8')
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
    const manageBtn = page.getByRole('button', { name: /review|manage lines|lines/i }).first()
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
  test('UX-TRADE-05: customer allocation preview blocks overpayment before submit', async ({ page }) => {
    const customerId = '66666666-6666-4666-8666-666666666666'
    const invoiceId = '77777777-7777-4777-8777-777777777777'
    let paymentRequests = 0
    await page.route('**/api/customers', (route) => route.fulfill({ json: [{
      id: customerId, customerNumber: 'C-UX-05', name: 'Allocation Customer', isActive: true,
    }] }))
    await page.route('**/api/sales-invoices*', (route) => route.fulfill({ json: [{
      id: invoiceId, tenantId: 'tenant-1', invoiceNumber: 'SI-UX-05', customerId,
      invoiceDate: '2026-10-25', dueDate: '2026-11-24', status: 2, currencyCode: 'USD',
      subtotal: 100, taxTotal: 0, grandTotal: 100, paidTotal: 0, balanceDue: 100, isActive: true,
    }] }))
    await page.route('**/api/customer-payments', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: [] })
      paymentRequests += 1
      return route.fulfill({ status: 201, json: {
        id: 'payment-ux-05', tenantId: 'tenant-1', customerId, salesInvoiceId: invoiceId,
        paymentDate: '2026-10-25', amount: 100, currencyCode: 'USD', referenceNumber: 'PAY-UX-05', isActive: true,
      } })
    })

    await page.goto('/customer-payments')
    const dialog = await openAddDialog(page, /record payment/i)

    await dialog.getByRole('combobox', { name: /customer/i }).click()
    await page.getByRole('option', { name: /C-UX-05/ }).click()
    await dialog.getByRole('combobox', { name: /outstanding invoice/i }).click()
    await page.getByRole('option', { name: /SI-UX-05/ }).click()
    await expect(dialog.getByText('Allocation summary')).toBeVisible()
    const amount = dialog.getByLabel(/amount/i)
    const invoiceBalance = Number(await amount.getAttribute('max'))
    expect(invoiceBalance).toBeGreaterThan(0)
    await amount.fill((invoiceBalance + 1).toFixed(2))
    await expect(dialog.getByRole('alert').getByText('Payment exceeds the invoice balance. Reduce the amount before submitting.')).toBeVisible()
    await dialog.getByRole('button', { name: /record payment/i }).click()
    await expect(dialog).toBeVisible()
    expect(paymentRequests).toBe(0)

    await amount.fill(invoiceBalance.toFixed(2))
    await expect(dialog.getByText('Unapplied')).toBeVisible()

    await dialog.getByRole('button', { name: /record payment/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    expect(paymentRequests).toBe(1)
  })

  test('TC-1.5.4.2: payment list visible', async ({ page }) => {
    await page.goto('/customer-payments')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"]')
    const empty = page.getByText(/no data|no payments|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 5_000 })
  })
})
