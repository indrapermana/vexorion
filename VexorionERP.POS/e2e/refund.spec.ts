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
import { AUTH_CREDENTIALS } from './fixtures'
import { request as playwrightRequest, type APIResponse } from '@playwright/test'
import { randomUUID } from 'node:crypto'

type JsonObject = Record<string, unknown>
type RunApiRequest = <T>(method: 'GET' | 'POST' | 'PUT', path: string, data?: JsonObject) => Promise<T>

async function readJson<T>(response: APIResponse, operation: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}.`)
  }
  return response.json() as Promise<T>
}

async function createRunApiContext() {
  const apiBaseUrl = process.env.E2E_API_BASE_URL?.replace(/\/$/u, '')
  if (!apiBaseUrl) throw new Error('E2E_API_BASE_URL is required for the POS refund integration scenario.')

  const anonymous = await playwrightRequest.newContext()
  try {
    const loginResponse = await anonymous.post(`${apiBaseUrl}/auth/login`, {
      data: {
        tenantCode: AUTH_CREDENTIALS.tenantCode,
        userNameOrEmail: AUTH_CREDENTIALS.username,
        password: AUTH_CREDENTIALS.password,
      },
    })
    const session = await readJson<{ accessToken: string }>(loginResponse, 'POS test-user login')
    const api = await playwrightRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${session.accessToken}` },
    })
    const currentUser = await readJson<{ permissions: string[] }>(
      await api.get(`${apiBaseUrl}/auth/me`),
      'POS test-user permission check',
    )
    const requiredPermissions = [
      'customers.manage',
      'customers.view',
      'inventory.manage',
      'inventory.view',
      'pos.checkout',
      'pos.refund',
      'products.manage',
      'products.view',
      'sales.view',
    ]
    const missingPermissions = requiredPermissions.filter((permission) => !currentUser.permissions.includes(permission))
    if (missingPermissions.length > 0) {
      await api.dispose()
      throw new Error(`Generated E2E tenant administrator is missing required permissions: ${missingPermissions.join(', ')}.`)
    }

    const requestJson = async <T>(method: 'GET' | 'POST' | 'PUT', path: string, data?: JsonObject): Promise<T> => {
      const response = await api.fetch(`${apiBaseUrl}${path}`, { method, data })
      return readJson<T>(response, `POS E2E fixture ${method} ${path}`)
    }

    return { api, requestJson }
  } finally {
    await anonymous.dispose()
  }
}

async function seedPosCatalog(requestJson: RunApiRequest, suffix: string) {
  const customer = await requestJson<{ id: string }>('POST', '/customers', {
    customerNumber: `POS-E2E-${suffix}`,
    name: `POS E2E Customer ${suffix}`,
  })
  const warehouse = await requestJson<{ id: string }>('POST', '/warehouses', {
    code: `P${suffix}`,
    name: `POS E2E Warehouse ${suffix}`,
  })
  const product = await requestJson<{ id: string; name: string }>('POST', '/products', {
    sku: `POS-E2E-${suffix}`,
    name: `POS E2E Product ${suffix}`,
    unitOfMeasure: 'EA',
    standardCost: 5,
    salesPrice: 10,
    reorderLevel: 0,
  })
  const adjustmentNumber = `POS-E2E-${suffix}`
  const adjustmentDate = new Date().toISOString().slice(0, 10)
  const adjustment = await requestJson<{ id: string }>('POST', '/inventory-adjustments', {
    adjustmentNumber,
    warehouseId: warehouse.id,
    adjustmentDate,
    reason: `POS E2E fixture ${suffix}`,
  })
  await requestJson('POST', `/inventory-adjustments/${adjustment.id}/lines`, {
    productId: product.id,
    quantityDelta: 5,
    unitCost: 5,
    reason: `POS E2E fixture ${suffix}`,
  })
  await requestJson('PUT', `/inventory-adjustments/${adjustment.id}`, {
    adjustmentNumber,
    warehouseId: warehouse.id,
    adjustmentDate,
    status: 4,
    reason: `POS E2E fixture ${suffix}`,
  })
  return { customer, warehouse, product }
}

async function ensureOpenShift(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const dialog = page.getByRole('dialog', { name: /open shift/i })
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('spinbutton').fill('100')
    const opened = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith('/api/pos/shifts/open'),
    )
    await dialog.getByRole('button', { name: /open shift/i }).click()
    const response = await opened
    expect(response.ok()).toBeTruthy()
    await expect(dialog).not.toBeVisible()
  }
}

test.describe('POS Return & Refund', () => {
  // -------------------------------------------------------------------------
  // TC-2.4.1 — Open return dialog
  // -------------------------------------------------------------------------
  test('TC-2.4.1: return/refund button opens dialog', async ({ page }) => {
    await ensureOpenShift(page)

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
    await ensureOpenShift(page)

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
    await ensureOpenShift(page)

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
  // TC-2.4.4 — Return button requires an open shift
  // -------------------------------------------------------------------------
  test('TC-2.4.4: return/refund appears after opening a shift', async ({ page }) => {
    await ensureOpenShift(page)
    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
  })

  test('TC-2.4.5: partial return submits one atomic request and shows settlement', async ({ page }) => {
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { customer, warehouse, product } = await seedPosCatalog(requestJson, suffix)

    await ensureOpenShift(page)
    const shift = await requestJson<{ id: string }>('GET', '/pos/shifts/current')
    const sale = await requestJson<{
      salesInvoiceId: string
      invoiceNumber: string
    }>('POST', '/pos/checkout', {
      idempotencyKey: randomUUID(),
      shiftId: shift.id,
      customerId: customer.id,
      warehouseId: warehouse.id,
      isDelivery: false,
      notes: `POS refund E2E fixture ${suffix}`,
      paymentMethod: 'CASH',
      paymentAmount: 20,
      lines: [{ productId: product.id, quantity: 2, unitPrice: 0, discountAmount: 0 }],
    })

    const refundRequests: JsonObject[] = []
    const refundResponses: Array<{ refundId: string; replayed: boolean }> = []
    let dropFirstResponse = true
    await page.route('**/api/pos/refund', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      refundRequests.push(route.request().postDataJSON() as JsonObject)
      const response = await route.fetch()
      const result = await response.json() as { refundId: string; replayed: boolean }
      expect(response.ok()).toBeTruthy()
      refundResponses.push(result)
      if (dropFirstResponse) {
        dropFirstResponse = false
        await route.abort('connectionreset')
        return
      }
      await route.fulfill({ response, body: JSON.stringify(result) })
    })

    try {
      await page.getByRole('button', { name: /return.*refund|refund|return/i }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel(/invoice number/i).fill(sale.invoiceNumber)
      await dialog.getByRole('button', { name: /search/i }).click()
      await expect(dialog.getByText('Qty remaining')).toBeVisible()
      await dialog.getByRole('spinbutton').fill('1')
      await dialog.getByRole('button', { name: /confirm return/i }).click()

      await expect(dialog.getByText(/CR-POS-/)).toBeVisible({ timeout: 15_000 })
      await expect(dialog.getByText(/Cash refund: USD 10\.00/)).toBeVisible()

      expect(refundRequests).toHaveLength(2)
      expect(refundRequests[0]).toEqual(refundRequests[1])
      expect(refundResponses).toHaveLength(2)
      expect(refundResponses[0].replayed).toBe(false)
      expect(refundResponses[1].replayed).toBe(true)
      expect(refundResponses[0].refundId).toBe(refundResponses[1].refundId)

      const invoice = await requestJson<{ appliedCreditTotal: number; paidTotal: number }>(
        'GET',
        `/sales-invoices/${sale.salesInvoiceId}`,
      )
      expect(invoice.appliedCreditTotal).toBe(10)
      expect(invoice.paidTotal).toBe(10)

      const balances = await requestJson<Array<{ productId: string; quantityOnHand: number }>>(
        'GET',
        '/inventory-balances',
      )
      expect(balances.find((balance) => balance.productId === product.id)?.quantityOnHand).toBe(4)
    } finally {
      await api.dispose()
    }
  })

  test('POS-01B: cashier checkout retries an unknown outcome and shows one receipt', async ({ page }) => {
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { product } = await seedPosCatalog(requestJson, suffix)
    const checkoutRequests: JsonObject[] = []
    const checkoutResponses: Array<{ invoiceNumber: string; salesInvoiceId: string; replayed: boolean }> = []
    let dropFirstResponse = true

    await ensureOpenShift(page)
    await page.route('**/api/pos/checkout', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      checkoutRequests.push(route.request().postDataJSON() as JsonObject)
      const response = await route.fetch()
      const result = await response.json() as { invoiceNumber: string; salesInvoiceId: string; replayed: boolean }
      expect(response.ok()).toBeTruthy()
      checkoutResponses.push(result)
      if (dropFirstResponse) {
        dropFirstResponse = false
        await route.abort('connectionreset')
        return
      }
      await route.fulfill({ response, body: JSON.stringify(result) })
    })

    try {
      await expect(page.getByText(product.name, { exact: true })).toBeVisible()
      const productCard = page.locator('.MuiCard-root').filter({ hasText: product.name })
      await productCard.getByRole('button', { name: /^add$/i }).click()
      await page.getByLabel(/payment amount/i).fill('10')
      await page.getByRole('button', { name: /checkout/i }).click()

      const receipt = page.getByRole('dialog', { name: /receipt/i })
      await expect(receipt).toBeVisible({ timeout: 15_000 })
      expect(checkoutRequests).toHaveLength(2)
      expect(checkoutRequests[0]).toEqual(checkoutRequests[1])
      expect(checkoutRequests[0].idempotencyKey).toEqual(checkoutRequests[1].idempotencyKey)
      expect(checkoutResponses).toHaveLength(2)
      expect(checkoutResponses[0].replayed).toBe(false)
      expect(checkoutResponses[1].replayed).toBe(true)
      expect(checkoutResponses[0].salesInvoiceId).toBe(checkoutResponses[1].salesInvoiceId)
      await expect(receipt.getByText(checkoutResponses[0].salesInvoiceId)).toBeVisible()
      await expect(receipt.getByText(product.name)).toBeVisible()

      const invoices = await requestJson<Array<{ invoiceNumber: string }>>('GET', '/sales-invoices')
      expect(invoices.filter((invoice) => invoice.invoiceNumber === checkoutResponses[0].invoiceNumber)).toHaveLength(1)
      const balances = await requestJson<Array<{ productId: string; quantityOnHand: number }>>('GET', '/inventory-balances')
      expect(balances.find((balance) => balance.productId === product.id)?.quantityOnHand).toBe(4)
      await receipt.getByRole('button', { name: /close/i }).click()
      await expect(receipt).not.toBeVisible()
    } finally {
      await api.dispose()
    }
  })
})
