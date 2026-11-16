/** Persisted sales/purchasing source, fulfillment, allocation, concurrency, stock, and ledger coverage. */
import { randomUUID } from 'node:crypto'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'
import { expect, test, uid } from './fixtures'

const DRAFT = 1
const CONFIRMED = 2
const COMPLETED = 4
const ISSUED = 2
const PARTIALLY_PAID = 3
const PAID = 4
const tradeDate = '2042-06-15'
const postingDate = '2042-07-01'
const purchaseDate = '2043-06-15'
const purchasePostingDate = '2043-07-01'

type Order = CreatedEntity & { orderNumber: string; status: number; currencyCode: string; totalAmount: number; customerId?: string; supplierId?: string; warehouseId: string }
type OrderLine = CreatedEntity & { productId: string; quantity: number; shippedQuantity?: number; receivedQuantity?: number; remainingQuantity: number; unitPrice?: number; unitCost?: number; discountAmount?: number; lineTotal: number }
type Fulfillment = CreatedEntity & { status: number; salesOrderId?: string; purchaseOrderId?: string; lines: Array<{ productId: string; shippedQuantity?: number; receivedQuantity?: number }> }
type Invoice = CreatedEntity & { invoiceNumber: string; status: number; currencyCode: string; sourceSalesOrderId?: string; sourcePurchaseOrderId?: string; subtotal: number; grandTotal: number; paidTotal: number; balanceDue: number }
type InvoiceLine = CreatedEntity & { productId: string; quantity: number; unitPrice?: number; unitCost?: number; discountAmount: number; lineTotal: number }
type Balance = CreatedEntity & { productId: string; warehouseId: string; quantityOnHand: number; quantityReserved: number; quantityAvailable: number }
type Movement = { referenceNumber: string; quantityOnHandDelta: number; sourceDocumentType: string | null; sourceDocumentId: string | null }
type MovementAudit = { items: Movement[] }
type Journal = CreatedEntity & { sourceDocumentType: string; sourceDocumentId: string | null; totalDebit: number; totalCredit: number; lines: Array<{ accountId: string; debitAmount: number; creditAmount: number }> }
type ApiResult<T = unknown> = { status: number; body: T | null }

function number(prefix: string) {
  return `${uid(prefix).replace(/[^a-z0-9]/gi, '').slice(-10)}${randomUUID().slice(0, 6)}`.toUpperCase().slice(0, 50)
}

function expectSuccessStatus(result: ApiResult, operation: string) {
  expect(result.status, `${operation}: ${JSON.stringify(result.body)}`).toBeGreaterThanOrEqual(200)
  expect(result.status, `${operation}: ${JSON.stringify(result.body)}`).toBeLessThan(300)
}

async function parallelPost(page: Parameters<typeof authenticatedApi>[0], paths: string[]) {
  return page.evaluate(async (requestPaths) => {
    const persisted = window.localStorage.getItem('vexorionerp.auth')
    const token = persisted
      ? (JSON.parse(persisted) as { state?: { session?: { accessToken?: string } } }).state?.session?.accessToken
      : undefined
    if (!token) throw new Error('Authenticated E2E session is missing its access token.')
    return Promise.all(requestPaths.map(async (path) => {
      const response = await fetch(`/api${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) as unknown : null }
    }))
  }, paths)
}

async function createCommonFixture(page: Parameters<typeof authenticatedApi>[0]) {
  const suffix = number('TRD')
  const product = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/products', 'POST', {
    sku: `SKU${suffix}`.slice(0, 50), name: `Trade product ${suffix}`, unitOfMeasure: 'EA', standardCost: 7.25, salesPrice: 12.34, reorderLevel: 0,
  }), 'Trade product creation')
  const warehouse = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/warehouses', 'POST', {
    code: `W${suffix}`.slice(0, 50), name: `Trade warehouse ${suffix}`, locationDescription: 'Disposable trade lifecycle fixture',
  }), 'Trade warehouse creation')
  const customer = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/customers', 'POST', {
    customerNumber: `C${suffix}`.slice(0, 50), name: `Trade customer ${suffix}`,
  }), 'Trade customer creation')
  const supplier = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/suppliers', 'POST', {
    supplierNumber: `S${suffix}`.slice(0, 50), name: `Trade supplier ${suffix}`,
  }), 'Trade supplier creation')
  return { suffix, product, warehouse, customer, supplier }
}

async function createBalance(page: Parameters<typeof authenticatedApi>[0], productId: string, warehouseId: string, quantityOnHand: number) {
  return expectSuccessfulFixture(await authenticatedApi<Balance>(page, '/inventory-balances', 'POST', {
    productId, warehouseId, quantityOnHand, quantityReserved: 0,
  }), 'Opening trade inventory balance')
}

async function getBalance(page: Parameters<typeof authenticatedApi>[0], productId: string, warehouseId: string) {
  const balances = expectSuccessfulFixture(await authenticatedApi<Balance[]>(page, '/inventory-balances', 'GET'), 'Trade inventory balance query')
  const balance = balances.find((item) => item.productId === productId && item.warehouseId === warehouseId)
  expect(balance).toBeDefined()
  return balance as Balance
}

async function movements(page: Parameters<typeof authenticatedApi>[0], productId: string, reference: string) {
  const audit = expectSuccessfulFixture(await authenticatedApi<MovementAudit>(page, `/inventory-reports/movement-audit?productId=${productId}&take=100`, 'GET'), 'Trade movement audit')
  return audit.items.filter((item) => item.referenceNumber === reference)
}

async function allMovements(page: Parameters<typeof authenticatedApi>[0], productId: string) {
  return expectSuccessfulFixture(
    await authenticatedApi<MovementAudit>(page, `/inventory-reports/movement-audit?productId=${productId}&take=100`, 'GET'),
    'Complete trade movement audit',
  ).items
}

async function createAccount(page: Parameters<typeof authenticatedApi>[0], code: string, name: string, accountType: number, normalBalance: number) {
  return expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/accounts', 'POST', {
    code, name, accountType, normalBalance, isPostingAllowed: true, isActive: true,
  }), `${name} account creation`)
}

async function ensurePostingFixture(page: Parameters<typeof authenticatedApi>[0], suffix: string, year: number) {
  const period = await authenticatedApi(page, '/fiscal-periods', 'POST', { periodCode: `T${year}${suffix}`.slice(0, 50), startDate: `${year}-01-01`, endDate: `${year}-12-31`, isClosed: false })
  expectSuccessStatus(period, 'Trade fiscal period creation')
  return {
    cash: await createAccount(page, `CA${suffix}`.slice(0, 50), 'Trade Cash', 1, 1),
    receivable: await createAccount(page, `AR${suffix}`.slice(0, 50), 'Trade Receivable', 1, 1),
    payable: await createAccount(page, `AP${suffix}`.slice(0, 50), 'Trade Payable', 2, 2),
    revenue: await createAccount(page, `RV${suffix}`.slice(0, 50), 'Trade Revenue', 4, 2),
    expense: await createAccount(page, `EX${suffix}`.slice(0, 50), 'Trade Expense', 5, 1),
  }
}

test('SAL-001/003-008: sales source, fulfillment, allocation, stock, concurrency, and ledger reconcile', async ({ page }) => {
  const fixture = await createCommonFixture(page)
  const accounts = await ensurePostingFixture(page, fixture.suffix, 2042)
  await createBalance(page, fixture.product.id, fixture.warehouse.id, 30)
  const orderNumber = number('SO')
  const order = expectSuccessfulFixture(await authenticatedApi<Order>(page, '/sales-orders', 'POST', {
    orderNumber, customerId: fixture.customer.id, warehouseId: fixture.warehouse.id, orderDate: tradeDate, requiredDate: '2042-06-30', status: DRAFT, currencyCode: 'usd', notes: 'Disposable sales lifecycle',
  }), 'Sales order creation')
  const line = expectSuccessfulFixture(await authenticatedApi<OrderLine>(page, `/sales-orders/${order.id}/lines`, 'POST', {
    productId: fixture.product.id, quantity: 10, unitPrice: 12.34, discountAmount: 3.4,
  }), 'Sales order line creation')
  expect(line.lineTotal).toBe(120)
  const confirmed = expectSuccessfulFixture(await authenticatedApi<Order>(page, `/sales-orders/${order.id}`, 'PUT', {
    orderNumber, customerId: fixture.customer.id, warehouseId: fixture.warehouse.id, orderDate: tradeDate, requiredDate: '2042-06-30', status: CONFIRMED, currencyCode: 'USD', notes: 'Disposable sales lifecycle', isActive: true,
  }), 'Sales order confirmation')
  expect(confirmed).toEqual(expect.objectContaining({ status: CONFIRMED, currencyCode: 'USD', totalAmount: 120 }))
  const immutable = await authenticatedApi(page, `/sales-orders/${order.id}`, 'PUT', {
    orderNumber, customerId: fixture.customer.id, warehouseId: fixture.warehouse.id, orderDate: tradeDate, requiredDate: '2042-07-01', status: CONFIRMED, currencyCode: 'USD', isActive: true,
  })
  expect(immutable.status).toBe(409)
  expect((await authenticatedApi(page, `/sales-orders/${order.id}/lines/${line.id}`, 'PUT', { productId: fixture.product.id, quantity: 11, unitPrice: 12.34, discountAmount: 3.4, isActive: true })).status).toBe(409)
  expect((await authenticatedApi(page, `/sales-orders/${order.id}`, 'DELETE')).status).toBe(409)

  const shipmentA = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/sales-shipments', 'POST', {
    shipmentNumber: number('SHA'), salesOrderId: order.id, warehouseId: fixture.warehouse.id, shipmentDate: tradeDate,
    lines: [{ salesOrderLineId: line.id, productId: fixture.product.id, shippedQuantity: 6, unitPrice: 12.34 }],
  }), 'First competing shipment creation')
  const shipmentB = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/sales-shipments', 'POST', {
    shipmentNumber: number('SHB'), salesOrderId: order.id, warehouseId: fixture.warehouse.id, shipmentDate: tradeDate,
    lines: [{ salesOrderLineId: line.id, productId: fixture.product.id, shippedQuantity: 6, unitPrice: 12.34 }],
  }), 'Second competing shipment creation')
  const competing = await parallelPost(page, [`/sales-shipments/${shipmentA.id}/post`, `/sales-shipments/${shipmentB.id}/post`])
  expect(competing.filter((result) => result.status >= 200 && result.status < 300)).toHaveLength(1)
  expect(competing.filter((result) => result.status === 409 || result.status === 400)).toHaveLength(1)
  let lines = expectSuccessfulFixture(await authenticatedApi<OrderLine[]>(page, `/sales-orders/${order.id}/lines`, 'GET'), 'Sales order lines after competing shipment')
  expect(lines[0]).toEqual(expect.objectContaining({ shippedQuantity: 6, remainingQuantity: 4 }))
  expect((await getBalance(page, fixture.product.id, fixture.warehouse.id)).quantityOnHand).toBe(24)
  const overShipment = await authenticatedApi(page, '/sales-shipments', 'POST', {
    shipmentNumber: number('OVER'), salesOrderId: order.id, warehouseId: fixture.warehouse.id, shipmentDate: tradeDate,
    lines: [{ salesOrderLineId: line.id, productId: fixture.product.id, shippedQuantity: 5, unitPrice: 12.34 }],
  })
  expect(overShipment.status).toBe(400)
  expect(JSON.stringify(overShipment.body)).toMatch(/over-shipment|allows 4/i)
  const finalShipmentNumber = number('SHF')
  const finalShipment = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/sales-shipments', 'POST', {
    shipmentNumber: finalShipmentNumber, salesOrderId: order.id, warehouseId: fixture.warehouse.id, shipmentDate: tradeDate,
    lines: [{ salesOrderLineId: line.id, productId: fixture.product.id, shippedQuantity: 4, unitPrice: 12.34 }],
  }), 'Final sales shipment creation')
  expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, `/sales-shipments/${finalShipment.id}/post`, 'POST'), 'Final sales shipment posting')
  lines = expectSuccessfulFixture(await authenticatedApi<OrderLine[]>(page, `/sales-orders/${order.id}/lines`, 'GET'), 'Completed sales order lines')
  expect(lines[0]).toEqual(expect.objectContaining({ shippedQuantity: 10, remainingQuantity: 0 }))
  expect((await authenticatedApi<Order>(page, `/sales-orders/${order.id}`, 'GET')).body).toEqual(expect.objectContaining({ status: COMPLETED }))
  expect((await getBalance(page, fixture.product.id, fixture.warehouse.id)).quantityOnHand).toBe(20)
  const finalMovements = await movements(page, fixture.product.id, finalShipmentNumber)
  expect(finalMovements.reduce((sum, item) => sum + item.quantityOnHandDelta, 0)).toBe(-4)
  const salesMovements = (await allMovements(page, fixture.product.id)).filter((item) => item.sourceDocumentType === 'SalesShipment')
  expect(salesMovements.reduce((sum, item) => sum + item.quantityOnHandDelta, 0)).toBe(-10)

  const invoice = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, '/sales-invoices', 'POST', {
    invoiceNumber: number('SI'), sourceSalesOrderId: order.id, invoiceDate: tradeDate, dueDate: '2042-07-15', currencyCode: 'USD',
  }), 'Source sales invoice creation')
  expect(invoice).toEqual(expect.objectContaining({ sourceSalesOrderId: order.id, currencyCode: 'USD', subtotal: 120, grandTotal: 120 }))
  const invoiceLines = expectSuccessfulFixture(await authenticatedApi<InvoiceLine[]>(page, `/sales-invoices/${invoice.id}/lines`, 'GET'), 'Source sales invoice lines')
  expect(invoiceLines).toEqual([expect.objectContaining({ productId: fixture.product.id, quantity: 10, unitPrice: 12.34, discountAmount: 3.4, lineTotal: 120 })])
  const duplicate = await authenticatedApi(page, '/sales-invoices', 'POST', { invoiceNumber: number('SIDUP'), sourceSalesOrderId: order.id, invoiceDate: tradeDate, dueDate: '2042-07-15', currencyCode: 'USD' })
  expect(duplicate.status).toBe(409)
  expect(JSON.stringify(duplicate.body)).toMatch(/already been invoiced/i)
  const issued = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, `/sales-invoices/${invoice.id}`, 'PUT', {
    invoiceNumber: invoice.invoiceNumber, customerId: fixture.customer.id, sourceSalesOrderId: order.id, invoiceDate: tradeDate, dueDate: '2042-07-15', status: ISSUED, currencyCode: 'USD', isActive: true,
  }), 'Sales invoice issue')
  expect(issued.status).toBe(ISSUED)
  expect((await authenticatedApi(page, `/sales-invoices/${invoice.id}`, 'PUT', {
    invoiceNumber: invoice.invoiceNumber, customerId: fixture.customer.id, sourceSalesOrderId: order.id, invoiceDate: tradeDate, dueDate: '2042-07-16', status: ISSUED, currencyCode: 'USD', isActive: true,
  })).status).toBe(409)
  expect((await authenticatedApi(page, `/sales-invoices/${invoice.id}`, 'DELETE')).status).toBe(409)
  const invoiceJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/sales-invoices/${invoice.id}`, 'POST', {
    receivableAccountId: accounts.receivable.id, revenueAccountId: accounts.revenue.id, postingDate,
  }), 'Sales invoice ledger posting')
  expect(invoiceJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'SalesInvoice', sourceDocumentId: invoice.id, totalDebit: 120, totalCredit: 120 }))

  const firstPayment = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/customer-payments', 'POST', {
    customerId: fixture.customer.id, salesInvoiceId: invoice.id, paymentDate: postingDate, amount: 50, currencyCode: 'USD', referenceNumber: number('CP1'), paymentMethod: 'Bank',
  }), 'Partial customer payment')
  const partiallyPaid = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, `/sales-invoices/${invoice.id}`, 'GET'), 'Partially paid sales invoice')
  expect(partiallyPaid).toEqual(expect.objectContaining({ status: PARTIALLY_PAID, paidTotal: 50, balanceDue: 70 }))
  expect((await authenticatedApi(page, '/customer-payments', 'POST', { customerId: fixture.customer.id, salesInvoiceId: invoice.id, paymentDate: postingDate, amount: 71, currencyCode: 'USD' })).status).toBe(400)
  const paymentJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/customer-payments/${firstPayment.id}`, 'POST', {
    cashAccountId: accounts.cash.id, receivableAccountId: accounts.receivable.id, postingDate,
  }), 'Customer payment ledger posting')
  expect(paymentJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'CustomerPayment', sourceDocumentId: firstPayment.id, totalDebit: 50, totalCredit: 50 }))
  expectSuccessfulFixture(await authenticatedApi(page, '/customer-payments', 'POST', {
    customerId: fixture.customer.id, salesInvoiceId: invoice.id, paymentDate: postingDate, amount: 70, currencyCode: 'USD', referenceNumber: number('CP2'), paymentMethod: 'Bank',
  }), 'Final customer payment')
  expect((await authenticatedApi<Invoice>(page, `/sales-invoices/${invoice.id}`, 'GET')).body).toEqual(expect.objectContaining({ status: PAID, paidTotal: 120, balanceDue: 0 }))
})

test('PUR-001/003-007: purchasing source, receipt, allocation, stock, concurrency, and ledger reconcile', async ({ page }) => {
  const fixture = await createCommonFixture(page)
  const accounts = await ensurePostingFixture(page, fixture.suffix, 2043)
  await createBalance(page, fixture.product.id, fixture.warehouse.id, 5)
  const orderNumber = number('PO')
  const order = expectSuccessfulFixture(await authenticatedApi<Order>(page, '/purchase-orders', 'POST', {
    orderNumber, supplierId: fixture.supplier.id, warehouseId: fixture.warehouse.id, orderDate: purchaseDate, expectedReceiptDate: '2043-06-30', status: DRAFT, currencyCode: 'usd', notes: 'Disposable purchase lifecycle',
  }), 'Purchase order creation')
  const line = expectSuccessfulFixture(await authenticatedApi<OrderLine>(page, `/purchase-orders/${order.id}/lines`, 'POST', {
    productId: fixture.product.id, quantity: 10, unitCost: 7.25,
  }), 'Purchase order line creation')
  expect(line.lineTotal).toBe(72.5)
  const confirmed = expectSuccessfulFixture(await authenticatedApi<Order>(page, `/purchase-orders/${order.id}`, 'PUT', {
    orderNumber, supplierId: fixture.supplier.id, warehouseId: fixture.warehouse.id, orderDate: purchaseDate, expectedReceiptDate: '2043-06-30', status: CONFIRMED, currencyCode: 'USD', notes: 'Disposable purchase lifecycle', isActive: true,
  }), 'Purchase order confirmation')
  expect(confirmed).toEqual(expect.objectContaining({ status: CONFIRMED, currencyCode: 'USD', totalAmount: 72.5 }))
  expect((await authenticatedApi(page, `/purchase-orders/${order.id}`, 'PUT', {
    orderNumber, supplierId: fixture.supplier.id, warehouseId: fixture.warehouse.id, orderDate: purchaseDate, expectedReceiptDate: '2043-07-01', status: CONFIRMED, currencyCode: 'USD', isActive: true,
  })).status).toBe(409)
  expect((await authenticatedApi(page, `/purchase-orders/${order.id}/lines/${line.id}`, 'PUT', { productId: fixture.product.id, quantity: 11, unitCost: 7.25, isActive: true })).status).toBe(409)
  expect((await authenticatedApi(page, `/purchase-orders/${order.id}`, 'DELETE')).status).toBe(409)

  const receiptA = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/purchase-receipts', 'POST', {
    receiptNumber: number('RCA'), purchaseOrderId: order.id, warehouseId: fixture.warehouse.id, receiptDate: purchaseDate,
    lines: [{ purchaseOrderLineId: line.id, productId: fixture.product.id, receivedQuantity: 6, unitCost: 7.25 }],
  }), 'First competing receipt creation')
  const receiptB = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/purchase-receipts', 'POST', {
    receiptNumber: number('RCB'), purchaseOrderId: order.id, warehouseId: fixture.warehouse.id, receiptDate: purchaseDate,
    lines: [{ purchaseOrderLineId: line.id, productId: fixture.product.id, receivedQuantity: 6, unitCost: 7.25 }],
  }), 'Second competing receipt creation')
  const competing = await parallelPost(page, [`/purchase-receipts/${receiptA.id}/post`, `/purchase-receipts/${receiptB.id}/post`])
  expect(competing.filter((result) => result.status >= 200 && result.status < 300)).toHaveLength(1)
  expect(competing.filter((result) => result.status === 409 || result.status === 400)).toHaveLength(1)
  let lines = expectSuccessfulFixture(await authenticatedApi<OrderLine[]>(page, `/purchase-orders/${order.id}/lines`, 'GET'), 'Purchase lines after competing receipt')
  expect(lines[0]).toEqual(expect.objectContaining({ receivedQuantity: 6, remainingQuantity: 4 }))
  expect((await getBalance(page, fixture.product.id, fixture.warehouse.id)).quantityOnHand).toBe(11)
  const overReceipt = await authenticatedApi(page, '/purchase-receipts', 'POST', {
    receiptNumber: number('OVER'), purchaseOrderId: order.id, warehouseId: fixture.warehouse.id, receiptDate: purchaseDate,
    lines: [{ purchaseOrderLineId: line.id, productId: fixture.product.id, receivedQuantity: 5, unitCost: 7.25 }],
  })
  expect(overReceipt.status).toBe(400)
  expect(JSON.stringify(overReceipt.body)).toMatch(/over-receipt|allows 4/i)
  const finalReceiptNumber = number('RCF')
  const finalReceipt = expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, '/purchase-receipts', 'POST', {
    receiptNumber: finalReceiptNumber, purchaseOrderId: order.id, warehouseId: fixture.warehouse.id, receiptDate: purchaseDate,
    lines: [{ purchaseOrderLineId: line.id, productId: fixture.product.id, receivedQuantity: 4, unitCost: 7.25 }],
  }), 'Final purchase receipt creation')
  expectSuccessfulFixture(await authenticatedApi<Fulfillment>(page, `/purchase-receipts/${finalReceipt.id}/post`, 'POST'), 'Final purchase receipt posting')
  lines = expectSuccessfulFixture(await authenticatedApi<OrderLine[]>(page, `/purchase-orders/${order.id}/lines`, 'GET'), 'Completed purchase order lines')
  expect(lines[0]).toEqual(expect.objectContaining({ receivedQuantity: 10, remainingQuantity: 0 }))
  expect((await authenticatedApi<Order>(page, `/purchase-orders/${order.id}`, 'GET')).body).toEqual(expect.objectContaining({ status: COMPLETED }))
  expect((await getBalance(page, fixture.product.id, fixture.warehouse.id)).quantityOnHand).toBe(15)
  const finalMovements = await movements(page, fixture.product.id, finalReceiptNumber)
  expect(finalMovements.reduce((sum, item) => sum + item.quantityOnHandDelta, 0)).toBe(4)
  const purchaseMovements = (await allMovements(page, fixture.product.id)).filter((item) => item.sourceDocumentType === 'PurchaseReceipt')
  expect(purchaseMovements.reduce((sum, item) => sum + item.quantityOnHandDelta, 0)).toBe(10)

  const invoice = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, '/purchase-invoices', 'POST', {
    invoiceNumber: number('PI'), sourcePurchaseOrderId: order.id, invoiceDate: purchaseDate, dueDate: '2043-07-15', currencyCode: 'USD', vendorReferenceNumber: number('VR'),
  }), 'Source purchase invoice creation')
  expect(invoice).toEqual(expect.objectContaining({ sourcePurchaseOrderId: order.id, currencyCode: 'USD', subtotal: 72.5, grandTotal: 72.5 }))
  const invoiceLines = expectSuccessfulFixture(await authenticatedApi<InvoiceLine[]>(page, `/purchase-invoices/${invoice.id}/lines`, 'GET'), 'Source purchase invoice lines')
  expect(invoiceLines).toEqual([expect.objectContaining({ productId: fixture.product.id, quantity: 10, unitCost: 7.25, lineTotal: 72.5 })])
  const duplicate = await authenticatedApi(page, '/purchase-invoices', 'POST', { invoiceNumber: number('PIDUP'), sourcePurchaseOrderId: order.id, invoiceDate: purchaseDate, dueDate: '2043-07-15', currencyCode: 'USD' })
  expect(duplicate.status).toBe(409)
  expect(JSON.stringify(duplicate.body)).toMatch(/already been invoiced/i)
  const issued = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, `/purchase-invoices/${invoice.id}`, 'PUT', {
    invoiceNumber: invoice.invoiceNumber, supplierId: fixture.supplier.id, sourcePurchaseOrderId: order.id, invoiceDate: purchaseDate, dueDate: '2043-07-15', status: ISSUED, currencyCode: 'USD', isActive: true,
  }), 'Purchase invoice issue')
  expect(issued.status).toBe(ISSUED)
  expect((await authenticatedApi(page, `/purchase-invoices/${invoice.id}`, 'PUT', {
    invoiceNumber: invoice.invoiceNumber, supplierId: fixture.supplier.id, sourcePurchaseOrderId: order.id, invoiceDate: purchaseDate, dueDate: '2043-07-16', status: ISSUED, currencyCode: 'USD', isActive: true,
  })).status).toBe(409)
  expect((await authenticatedApi(page, `/purchase-invoices/${invoice.id}`, 'DELETE')).status).toBe(409)
  const invoiceJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/purchase-invoices/${invoice.id}`, 'POST', {
    payableAccountId: accounts.payable.id, expenseAccountId: accounts.expense.id, postingDate: purchasePostingDate,
  }), 'Purchase invoice ledger posting')
  expect(invoiceJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'PurchaseInvoice', sourceDocumentId: invoice.id, totalDebit: 72.5, totalCredit: 72.5 }))
  const payment = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/vendor-payments', 'POST', {
    supplierId: fixture.supplier.id, purchaseInvoiceId: invoice.id, paymentDate: purchasePostingDate, amount: 25, currencyCode: 'USD', referenceNumber: number('VP1'), paymentMethod: 'Bank',
  }), 'Partial vendor payment')
  expect((await authenticatedApi<Invoice>(page, `/purchase-invoices/${invoice.id}`, 'GET')).body).toEqual(expect.objectContaining({ status: PARTIALLY_PAID, paidTotal: 25, balanceDue: 47.5 }))
  expect((await authenticatedApi(page, '/vendor-payments', 'POST', { supplierId: fixture.supplier.id, purchaseInvoiceId: invoice.id, paymentDate: purchasePostingDate, amount: 48, currencyCode: 'USD' })).status).toBe(400)
  const paymentJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/vendor-payments/${payment.id}`, 'POST', {
    payableAccountId: accounts.payable.id, cashAccountId: accounts.cash.id, postingDate: purchasePostingDate,
  }), 'Vendor payment ledger posting')
  expect(paymentJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'VendorPayment', sourceDocumentId: payment.id, totalDebit: 25, totalCredit: 25 }))
  expectSuccessfulFixture(await authenticatedApi(page, '/vendor-payments', 'POST', {
    supplierId: fixture.supplier.id, purchaseInvoiceId: invoice.id, paymentDate: purchasePostingDate, amount: 47.5, currencyCode: 'USD', referenceNumber: number('VP2'), paymentMethod: 'Bank',
  }), 'Final vendor payment')
  expect((await authenticatedApi<Invoice>(page, `/purchase-invoices/${invoice.id}`, 'GET')).body).toEqual(expect.objectContaining({ status: PAID, paidTotal: 72.5, balanceDue: 0 }))
})
