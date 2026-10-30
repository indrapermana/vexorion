import { expect, test, type Page } from '@playwright/test'

const product = {
  id: '10000000-0000-0000-0000-000000000001',
  sku: 'SCAN-001',
  name: 'Acceptance Coffee',
  imageUrl: null,
  thumbnailUrl: null,
  unitOfMeasure: 'EA',
  standardCost: 2,
  salesPrice: 5,
  reorderLevel: 2,
  isActive: true,
}

const warehouse = {
  id: '20000000-0000-0000-0000-000000000001',
  code: 'MAIN',
  name: 'Main Warehouse',
  isActive: true,
}

const guestCustomer = {
  id: '30000000-0000-0000-0000-000000000001',
  customerNumber: 'GUEST',
  name: 'Guest',
  email: null,
  isActive: true,
}

async function mockRegisterData(page: Page) {
  await page.route('**/api/products', (route) => route.fulfill({ json: [product] }))
  await page.route('**/api/warehouses', (route) => route.fulfill({ json: [warehouse] }))
  await page.route('**/api/customers', (route) => route.fulfill({ json: [guestCustomer] }))
  await page.route('**/api/inventory-balances', (route) => route.fulfill({
    json: [{
      id: '40000000-0000-0000-0000-000000000001',
      productId: product.id,
      warehouseId: warehouse.id,
      quantityOnHand: 10,
      quantityReserved: 0,
      quantityAvailable: 10,
      isActive: true,
    }],
  }))
  await page.route('**/api/pos/shifts/current', (route) => route.fulfill({
    json: {
      id: '50000000-0000-0000-0000-000000000001',
      tenantId: '60000000-0000-0000-0000-000000000001',
      cashierId: '70000000-0000-0000-0000-000000000001',
      cashierName: 'Acceptance Cashier',
      openedAtUtc: '2026-10-30T00:00:00Z',
      closedAtUtc: null,
      openingFloat: 100,
      countedCash: null,
      currencyCode: 'USD',
      status: 'Open',
      notes: null,
    },
  }))
  await page.route('**/api/pos/checkout', (route) => route.fulfill({
    json: {
      salesOrderId: 'SO-ACCEPTANCE',
      orderNumber: 'SO-ACCEPTANCE',
      salesShipmentId: 'SHIP-ACCEPTANCE',
      shipmentNumber: 'SHIP-ACCEPTANCE',
      salesInvoiceId: 'INV-ACCEPTANCE',
      invoiceNumber: 'INV-ACCEPTANCE',
      customerPaymentId: 'PAY-ACCEPTANCE',
      shiftId: '50000000-0000-0000-0000-000000000001',
      currencyCode: 'USD',
      grandTotal: 5,
      amountTendered: 5,
      amountApplied: 5,
      changeDue: 0,
      completedAtUtc: '2026-10-30T00:10:00Z',
      replayed: false,
      lines: [{
        productId: product.id,
        quantity: 1,
        unitPrice: 5,
        discountAmount: 0,
        lineTotal: 5,
      }],
    },
  }))
}

test.describe('UX-POS-07 browser acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await mockRegisterData(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')
    await expect(page.getByText(product.name, { exact: true })).toBeVisible()
  })

  test('scanner, keyboard undo, offline recovery, touch targets, checkout, and printing work', async ({ page, context }) => {
    const scanner = page.getByLabel('Scan / Quick Add')
    await expect(scanner).toBeFocused()

    const catalogControls = [
      page.getByRole('button', { name: `Decrease quantity: ${product.name}` }),
      page.getByRole('button', { name: `Increase quantity: ${product.name}` }),
      page.getByRole('button', { name: 'Add' }),
    ]
    for (const control of catalogControls) {
      const box = await control.boundingBox()
      expect(box, 'critical catalog control must be visible').not.toBeNull()
      expect(box!.height, 'critical catalog touch target must be at least 44 px tall').toBeGreaterThanOrEqual(44)
      expect(box!.width, 'critical catalog touch target must be at least 44 px wide').toBeGreaterThanOrEqual(44)
    }

    await scanner.fill(product.sku)
    await scanner.press('Enter')
    await expect(page.getByRole('tab', { name: '1 items' })).toBeEnabled()

    await page.getByRole('tab', { name: 'Catalog' }).click()
    await page.keyboard.press('F8')
    await expect(page.getByRole('tab', { name: '0 items' })).toBeDisabled()

    await scanner.fill(product.sku)
    await scanner.press('Enter')
    await page.getByRole('tab', { name: '1 items' }).click()
    await expect(page.getByRole('list', { name: 'Cart line items' })).toContainText(product.name)
    await page.getByRole('button', { name: 'Use exact amount' }).click()

    const criticalControls = [
      page.getByRole('button', { name: `Decrease quantity: ${product.name}` }),
      page.getByRole('button', { name: `Increase quantity: ${product.name}` }),
      page.getByRole('button', { name: 'Cash' }),
      page.getByRole('button', { name: 'Checkout' }),
    ]
    for (const control of criticalControls) {
      const box = await control.boundingBox()
      expect(box, 'critical cashier control must be visible').not.toBeNull()
      expect(box!.height, 'critical cashier touch target must be at least 44 px tall').toBeGreaterThanOrEqual(44)
      expect(box!.width, 'critical cashier touch target must be at least 44 px wide').toBeGreaterThanOrEqual(44)
    }

    await context.setOffline(true)
    await expect(page.getByRole('status').filter({ hasText: 'POS is offline' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled()

    await context.setOffline(false)
    await expect(page.getByRole('status').filter({ hasText: 'POS is offline' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeEnabled()

    await page.keyboard.press('F2')
    const receipt = page.getByRole('dialog', { name: 'Receipt' })
    await expect(receipt).toBeVisible()
    await expect(receipt).toContainText('INV-ACCEPTANCE')

    const popupPromise = page.waitForEvent('popup')
    await receipt.getByRole('button', { name: 'Print' }).click()
    const printPopup = await popupPromise
    await expect(printPopup).toHaveTitle('Receipt')
  })
})
