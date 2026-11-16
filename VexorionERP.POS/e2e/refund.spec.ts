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
import { randomUUID } from 'node:crypto'
import { createRunApiContext, seedPosCatalog, type JsonObject } from './api-fixtures'

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
  await expect(page.getByText(/shift open since/i)).toBeVisible({ timeout: 5_000 })
}

async function expandRegisterActions(page: import('@playwright/test').Page) {
  const moreActions = page.getByRole('button', { name: /more register actions/i })
  if (await moreActions.isVisible().catch(() => false)) {
    await moreActions.click()
  }
}

async function selectWarehouse(page: import('@playwright/test').Page, warehouseName: string) {
  const warehouseSelector = page.getByRole('combobox', { name: /warehouse/i })
  await warehouseSelector.click()
  await page.getByRole('option', { name: new RegExp(warehouseName) }).click()
}

test.describe('POS Return & Refund', () => {
  // -------------------------------------------------------------------------
  // TC-2.4.1 — Open return dialog
  // -------------------------------------------------------------------------
  test('TC-2.4.1: return/refund button opens dialog', async ({ page }) => {
    await ensureOpenShift(page)
    await expandRegisterActions(page)

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
    await expandRegisterActions(page)

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
    await expandRegisterActions(page)

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
    await expandRegisterActions(page)
    const returnBtn = page.getByRole('button', { name: /return.*refund|refund|return/i })
    await expect(returnBtn).toBeVisible({ timeout: 5_000 })
  })

  test('TC-2.4.5: partial return submits one atomic request and shows settlement', async ({ page }) => {
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { customer, warehouse, product } = await seedPosCatalog(requestJson, suffix)

    await ensureOpenShift(page)
    await expandRegisterActions(page)
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

  test('POS-012: full cash refund reverses settlement, stock, and shift cash', async ({ page }) => {
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { customer, warehouse, product } = await seedPosCatalog(requestJson, suffix)

    try {
      await ensureOpenShift(page)
      await expandRegisterActions(page)
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
        notes: `POS full refund E2E fixture ${suffix}`,
        paymentMethod: 'CASH',
        paymentAmount: 20,
        lines: [{ productId: product.id, quantity: 2, unitPrice: 0, discountAmount: 0 }],
      })
      const reconciliationBefore = await requestJson<{
        cashSales: number
        cashRefunds: number
        expectedCash: number
      }>('GET', `/pos/shifts/${shift.id}/reconciliation`)

      let refundResponse: {
        refundId: string
        creditNoteId: string
        refundPaymentId: string | null
        totalCreditAmount: number
        refundAmount: number
        appliedCreditAmount: number
      } | undefined
      await page.route('**/api/pos/refund', async (route) => {
        if (route.request().method() !== 'POST') return route.continue()
        const response = await route.fetch()
        expect(response.ok()).toBeTruthy()
        refundResponse = await response.json() as typeof refundResponse
        await route.fulfill({ response, body: JSON.stringify(refundResponse) })
      })

      await page.getByRole('button', { name: /return.*refund|refund|return/i }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel(/invoice number/i).fill(sale.invoiceNumber)
      await dialog.getByRole('button', { name: /search/i }).click()
      await expect(dialog.getByText('Qty remaining')).toBeVisible()
      await dialog.getByRole('spinbutton').fill('2')
      await dialog.getByRole('button', { name: /confirm return/i }).click()

      await expect(dialog.getByText(/CR-POS-/)).toBeVisible({ timeout: 15_000 })
      await expect(dialog.getByText(/Credit total: USD 20\.00/)).toBeVisible()
      await expect(dialog.getByText(/Cash refund: USD 20\.00/)).toBeVisible()
      expect(refundResponse).toMatchObject({
        totalCreditAmount: 20,
        refundAmount: 20,
        appliedCreditAmount: 20,
      })
      expect(refundResponse?.refundId).toBeTruthy()
      expect(refundResponse?.creditNoteId).toBeTruthy()
      expect(refundResponse?.refundPaymentId).toBeTruthy()

      const invoice = await requestJson<{ appliedCreditTotal: number; paidTotal: number; balanceDue: number }>(
        'GET',
        `/sales-invoices/${sale.salesInvoiceId}`,
      )
      expect(invoice.appliedCreditTotal).toBe(20)
      expect(invoice.paidTotal).toBe(0)
      expect(invoice.balanceDue).toBe(0)

      const eligibility = await requestJson<{
        lines: Array<{ productId: string; quantityRemaining: number }>
      }>('GET', `/pos/refund/${sale.salesInvoiceId}/lines`)
      expect(eligibility.lines.some((line) => line.productId === product.id)).toBe(false)

      const balances = await requestJson<Array<{ productId: string; quantityOnHand: number }>>(
        'GET',
        '/inventory-balances',
      )
      expect(balances.find((balance) => balance.productId === product.id)?.quantityOnHand).toBe(5)

      const reconciliationAfter = await requestJson<{
        cashSales: number
        cashRefunds: number
        expectedCash: number
      }>('GET', `/pos/shifts/${shift.id}/reconciliation`)
      expect(reconciliationAfter.cashSales).toBe(reconciliationBefore.cashSales)
      expect(reconciliationAfter.cashRefunds).toBe(reconciliationBefore.cashRefunds + 20)
      expect(reconciliationAfter.expectedCash).toBe(reconciliationBefore.expectedCash - 20)
    } finally {
      await api.dispose()
    }
  })

  test('POS-01B: cashier checkout retries an unknown outcome and shows one receipt', async ({ page }) => {
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { warehouse, product } = await seedPosCatalog(requestJson, suffix)
    const checkoutRequests: JsonObject[] = []
    const checkoutResponses: Array<{ invoiceNumber: string; salesInvoiceId: string; replayed: boolean }> = []
    let dropFirstResponse = true

    await ensureOpenShift(page)
    await selectWarehouse(page, warehouse.name)
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
      await page.getByRole('spinbutton', { name: /cash received/i }).fill('10')
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

  test('UX-POS-01/02: mobile cashiers review compact cart and return to catalog without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { api, requestJson } = await createRunApiContext()
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    const { warehouse, product } = await seedPosCatalog(requestJson, suffix)

    try {
      await ensureOpenShift(page)
      await selectWarehouse(page, warehouse.name)
      const catalogStep = page.getByRole('tab', { name: 'Catalog' })
      await expect(catalogStep).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByText(product.name, { exact: true })).toBeVisible()
      const productCard = page.locator('.MuiCard-root').filter({ hasText: product.name })
      await productCard.getByRole('button', { name: /^add$/i }).click()

      const reviewButton = page.getByRole('button', { name: /review cart and pay/i })
      await expect(reviewButton).toBeEnabled()
      await reviewButton.click()
      const paymentStep = page.getByRole('tab', { name: /1 item/i })
      await expect(paymentStep).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('list', { name: 'Cart line items' })).toBeVisible()
      await expect(page.getByRole('spinbutton', { name: `Qty: ${product.name}` })).toHaveValue('1')
      await expect(page.getByRole('button', { name: `Increase quantity: ${product.name}` })).toBeVisible()
      await expect(page.getByRole('button', { name: `Remove: ${product.name}` })).toBeVisible()
      await expect(page.getByRole('spinbutton', { name: /cash received/i })).toBeVisible()

      for (const width of [390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      }

      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole('button', { name: /back to catalog/i }).click()
      await expect(catalogStep).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('.MuiCard-root').filter({ hasText: product.name })).toBeVisible()
    } finally {
      await api.dispose()
    }
  })
})
