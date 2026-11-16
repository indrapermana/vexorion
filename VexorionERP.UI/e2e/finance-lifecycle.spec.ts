/** Persisted finance posting, reversal, report, source, and aging reconciliation. */
import { randomUUID } from 'node:crypto'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'
import { expect, test, uid } from './fixtures'

const POSTED = 2
const ISSUED = 2
const date = '2040-06-15'
const asOfDate = '2040-06-30'

type Account = CreatedEntity & { code: string; accountType: number }
type JournalLine = { accountId: string; accountCode: string; debitAmount: number; creditAmount: number }
type Journal = CreatedEntity & { journalNumber: string; sourceDocumentType: string; sourceDocumentId: string | null; status: number; totalDebit: number; totalCredit: number; reversedJournalEntryId: string | null; lines: JournalLine[] }
type TrialBalance = { totalDebit: number; totalCredit: number; endingDebitTotal: number; endingCreditTotal: number; lines: Array<{ accountId: string; totalDebit: number; totalCredit: number; endingDebit: number; endingCredit: number }> }
type StatementLine = { accountId: string; accountCode: string; amount: number }
type ProfitAndLoss = { totalRevenue: number; totalExpenses: number; netIncome: number; revenueLines: StatementLine[]; expenseLines: StatementLine[]; priorPeriod: { totalRevenue: number; totalExpenses: number; netIncome: number } | null }
type BalanceSheet = { totalAssets: number; totalLiabilities: number; totalEquity: number; currentEarnings: number; totalLiabilitiesAndEquity: number; assetLines: StatementLine[]; liabilityLines: StatementLine[]; equityLines: StatementLine[] }
type DrillDown = { totalDebit: number; totalCredit: number; lines: Array<{ journalEntryId: string; journalNumber: string; debitAmount: number; creditAmount: number }> }
type Buckets = { current: number; due1To30: number; due31To60: number; due61To90: number; dueOver90: number; total: number }
type Aging<T extends string> = { totals: Buckets; items: Array<Record<T, string> & { currencyCode: string; buckets: Buckets }> }
type Invoice = CreatedEntity & { invoiceNumber: string; grandTotal: number; paidTotal: number; balanceDue: number; status: number }

function unique(prefix: string) {
  return `${uid(prefix).replace(/[^a-z0-9]/gi, '').slice(-10)}${randomUUID().slice(0, 6)}`.toUpperCase()
}

function expectSuccessStatus(result: { status: number; body: unknown }, operation: string) {
  expect(result.status, `${operation}: ${JSON.stringify(result.body)}`).toBeGreaterThanOrEqual(200)
  expect(result.status, `${operation}: ${JSON.stringify(result.body)}`).toBeLessThan(300)
}

async function fetchText(page: Parameters<typeof authenticatedApi>[0], path: string) {
  return page.evaluate(async (requestPath) => {
    const persisted = window.localStorage.getItem('vexorionerp.auth')
    const token = persisted
      ? (JSON.parse(persisted) as { state?: { session?: { accessToken?: string } } }).state?.session?.accessToken
      : undefined
    if (!token) throw new Error('Authenticated E2E session is missing its access token.')
    const response = await fetch(`/api${requestPath}`, { headers: { Authorization: `Bearer ${token}` } })
    return { status: response.status, text: await response.text(), contentType: response.headers.get('content-type') }
  }, path)
}

async function createAccount(page: Parameters<typeof authenticatedApi>[0], code: string, name: string, accountType: number, normalBalance: number) {
  return expectSuccessfulFixture(
    await authenticatedApi<Account>(page, '/accounts', 'POST', { code, name, accountType, normalBalance, isPostingAllowed: true, isActive: true }),
    `Account ${code} creation`,
  )
}

async function createPeriod(page: Parameters<typeof authenticatedApi>[0], code: string, startDate: string, endDate: string) {
  return expectSuccessfulFixture(
    await authenticatedApi<CreatedEntity>(page, '/fiscal-periods', 'POST', { periodCode: code, startDate, endDate, isClosed: false }),
    `Fiscal period ${code} creation`,
  )
}

async function createAndPostJournal(page: Parameters<typeof authenticatedApi>[0], description: string, postingDate: string, lines: Array<{ accountId: string; debitAmount: number; creditAmount: number }>) {
  const journal = expectSuccessfulFixture(
    await authenticatedApi<Journal>(page, '/posting/journals', 'POST', {
      postingDate,
      description,
      lines: lines.map((line) => ({ ...line, description })),
    }),
    `${description} journal creation`,
  )
  const posted = expectSuccessfulFixture(
    await authenticatedApi<Journal>(page, `/posting/journals/${journal.id}/post`, 'POST'),
    `${description} journal posting`,
  )
  expect(posted.status).toBe(POSTED)
  expect(posted.totalDebit).toBe(posted.totalCredit)
  return posted
}

test('FIN-003/004/006/008/009/010: journals, period gates, reversal, and reports reconcile', async ({ page }) => {
  const suffix = unique('FIN')
  const cash = await createAccount(page, `A${suffix}`.slice(0, 50), 'Automation Cash', 1, 1)
  const equity = await createAccount(page, `E${suffix}`.slice(0, 50), 'Automation Equity', 3, 2)
  const revenue = await createAccount(page, `R${suffix}`.slice(0, 50), 'Automation Revenue', 4, 2)
  const expense = await createAccount(page, `X${suffix}`.slice(0, 50), 'Automation Expense', 5, 1)
  const period = await createPeriod(page, `P${suffix}`.slice(0, 50), '2040-01-01', '2040-12-31')
  await createPeriod(page, `Q${suffix}`.slice(0, 50), '2039-01-01', '2039-12-31')

  const unbalanced = await authenticatedApi(page, '/posting/journals', 'POST', {
    postingDate: date,
    description: 'Unbalanced journal must fail',
    lines: [
      { accountId: cash.id, debitAmount: 10, creditAmount: 0 },
      { accountId: equity.id, debitAmount: 0, creditAmount: 9 },
    ],
  })
  expect(unbalanced.status).toBe(400)
  expect(JSON.stringify(unbalanced.body)).toMatch(/debits and credits must be equal/i)

  const uncovered = await authenticatedApi(page, '/posting/journals', 'POST', {
    postingDate: '2036-06-15',
    description: 'Uncovered period journal',
    lines: [
      { accountId: cash.id, debitAmount: 10, creditAmount: 0 },
      { accountId: equity.id, debitAmount: 0, creditAmount: 10 },
    ],
  })
  expect(uncovered.status).toBe(400)
  expect(JSON.stringify(uncovered.body)).toMatch(/no fiscal period/i)

  await createAndPostJournal(page, 'Prior revenue', '2039-06-15', [
    { accountId: cash.id, debitAmount: 90, creditAmount: 0 },
    { accountId: revenue.id, debitAmount: 0, creditAmount: 90 },
  ])

  const gated = expectSuccessfulFixture(
    await authenticatedApi<Journal>(page, '/posting/journals', 'POST', {
      postingDate: date,
      description: 'Closed period gate',
      lines: [
        { accountId: cash.id, debitAmount: 25, creditAmount: 0 },
        { accountId: equity.id, debitAmount: 0, creditAmount: 25 },
      ],
    }),
    'Closed-period draft journal creation',
  )
  expectSuccessStatus(await authenticatedApi(page, `/fiscal-periods/${period.id}/close`, 'POST'), 'Fiscal period close')
  const closedPost = await authenticatedApi(page, `/posting/journals/${gated.id}/post`, 'POST')
  expect(closedPost.status).toBe(409)
  expect(JSON.stringify(closedPost.body)).toMatch(/closed or unavailable/i)
  expectSuccessStatus(await authenticatedApi(page, `/fiscal-periods/${period.id}/reopen`, 'POST'), 'Fiscal period reopen')
  expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/journals/${gated.id}/post`, 'POST'), 'Corrected valid-period posting')

  await createAndPostJournal(page, 'Opening equity', date, [
    { accountId: cash.id, debitAmount: 1000, creditAmount: 0 },
    { accountId: equity.id, debitAmount: 0, creditAmount: 1000 },
  ])
  await createAndPostJournal(page, 'Current revenue', date, [
    { accountId: cash.id, debitAmount: 300, creditAmount: 0 },
    { accountId: revenue.id, debitAmount: 0, creditAmount: 300 },
  ])
  const expenseJournal = await createAndPostJournal(page, 'Current expense', date, [
    { accountId: expense.id, debitAmount: 100, creditAmount: 0 },
    { accountId: cash.id, debitAmount: 0, creditAmount: 100 },
  ])

  const trial = expectSuccessfulFixture(
    await authenticatedApi<TrialBalance>(page, `/reports/trial-balance?asOfDate=${asOfDate}`, 'GET'),
    'Trial balance report',
  )
  expect(trial.totalDebit).toBe(trial.totalCredit)
  expect(trial.endingDebitTotal).toBe(trial.endingCreditTotal)
  expect(trial.lines.find((line) => line.accountId === revenue.id)?.endingCredit).toBe(390)
  const trialCsv = await fetchText(page, `/reports/trial-balance/export?asOfDate=${asOfDate}`)
  expect(trialCsv.status).toBe(200)
  expect(trialCsv.contentType).toContain('text/csv')
  expect(trialCsv.text).toContain(`${revenue.code},Automation Revenue,0.00,390.00,0,390.00`)
  expect(trialCsv.text).toContain(`TOTAL,,${trial.totalDebit.toFixed(2)},${trial.totalCredit.toFixed(2)},${trial.endingDebitTotal.toFixed(2)},${trial.endingCreditTotal.toFixed(2)}`)

  const pnl = expectSuccessfulFixture(
    await authenticatedApi<ProfitAndLoss>(page, '/reports/profit-and-loss?startDate=2040-01-01&endDate=2040-12-31&priorStartDate=2039-01-01&priorEndDate=2039-12-31', 'GET'),
    'Profit and loss report',
  )
  expect(pnl).toEqual(expect.objectContaining({ totalRevenue: 300, totalExpenses: 100, netIncome: 200 }))
  expect(pnl.priorPeriod).toEqual(expect.objectContaining({ totalRevenue: 90, totalExpenses: 0, netIncome: 90 }))
  const revenueDrill = expectSuccessfulFixture(
    await authenticatedApi<DrillDown>(page, `/reports/account-drill-down/${revenue.id}?startDate=2040-01-01&endDate=2040-12-31`, 'GET'),
    'Revenue account drill-down',
  )
  expect(revenueDrill.totalCredit).toBe(300)
  expect(revenueDrill.lines).toEqual(expect.arrayContaining([expect.objectContaining({ journalNumber: expect.any(String), creditAmount: 300 })]))
  const pnlCsv = await fetchText(page, '/reports/profit-and-loss/export?startDate=2040-01-01&endDate=2040-12-31&priorStartDate=2039-01-01&priorEndDate=2039-12-31')
  expect(pnlCsv.text).toContain('Revenue Total,,,300')
  expect(pnlCsv.text).toContain('Expense Total,,,100')
  expect(pnlCsv.text).toContain('Net Income,,,200')

  const balanceSheet = expectSuccessfulFixture(
    await authenticatedApi<BalanceSheet>(page, `/reports/balance-sheet?asOfDate=${asOfDate}`, 'GET'),
    'Balance sheet report',
  )
  expect(balanceSheet.totalAssets).toBe(balanceSheet.totalLiabilitiesAndEquity)
  expect(balanceSheet).toEqual(expect.objectContaining({ totalLiabilities: 0, totalEquity: 1025, currentEarnings: 290 }))
  const balanceCsv = await fetchText(page, `/reports/balance-sheet/export?asOfDate=${asOfDate}`)
  expect(balanceCsv.text).toContain(`Total Assets,,,${balanceSheet.totalAssets}`)
  expect(balanceCsv.text).toContain(`Total Equity & Liabilities,,,${balanceSheet.totalLiabilitiesAndEquity}`)

  const reversal = expectSuccessfulFixture(
    await authenticatedApi<Journal>(page, `/posting/journals/${expenseJournal.id}/reverse`, 'POST', { reversalDate: '2040-06-20' }),
    'Posted journal reversal',
  )
  expect(reversal.reversedJournalEntryId).toBe(expenseJournal.id)
  expect(reversal.lines).toEqual(expect.arrayContaining([
    expect.objectContaining({ accountId: expense.id, debitAmount: 0, creditAmount: 100 }),
    expect.objectContaining({ accountId: cash.id, debitAmount: 100, creditAmount: 0 }),
  ]))
  const repeated = await authenticatedApi(page, `/posting/journals/${expenseJournal.id}/reverse`, 'POST', { reversalDate: '2040-06-21' })
  expect(repeated.status).toBeGreaterThanOrEqual(400)
  expect(JSON.stringify(repeated.body)).toMatch(/posted|already been reversed/i)
})

test('FIN-005/011: invoice/payment journals and AR/AP aging reconcile by source, bucket, and currency', async ({ page }) => {
  const suffix = unique('SRC')
  const sourcePostingDate = '2040-07-01'
  const receivable = await createAccount(page, `AR${suffix}`.slice(0, 50), 'Automation Receivable', 1, 1)
  const cash = await createAccount(page, `CA${suffix}`.slice(0, 50), 'Automation Source Cash', 1, 1)
  const payable = await createAccount(page, `AP${suffix}`.slice(0, 50), 'Automation Payable', 2, 2)
  const revenue = await createAccount(page, `RV${suffix}`.slice(0, 50), 'Automation Source Revenue', 4, 2)
  const expense = await createAccount(page, `EX${suffix}`.slice(0, 50), 'Automation Source Expense', 5, 1)
  await createPeriod(page, `S${suffix}`.slice(0, 50), '2040-01-01', '2040-12-31')
  const customer = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/customers', 'POST', { customerNumber: `C${suffix}`.slice(0, 50), name: 'Finance automation customer' }), 'Customer creation')
  const supplier = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/suppliers', 'POST', { supplierNumber: `V${suffix}`.slice(0, 50), name: 'Finance automation supplier' }), 'Supplier creation')
  const product = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/products', 'POST', { sku: `P${suffix}`.slice(0, 50), name: 'Finance automation product', unitOfMeasure: 'EA', standardCost: 50, salesPrice: 100, reorderLevel: 0 }), 'Product creation')

  const createSalesInvoice = async (invoiceSuffix: string, amount: number, currencyCode: string, dueDate: string) => {
    const invoiceNumber = `SI-${invoiceSuffix}-${suffix}`.slice(0, 50)
    const invoice = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, '/sales-invoices', 'POST', { invoiceNumber, customerId: customer.id, invoiceDate: '2040-01-01', dueDate, status: 1, currencyCode }), `Sales invoice ${invoiceSuffix} creation`)
    expectSuccessfulFixture(await authenticatedApi(page, `/sales-invoices/${invoice.id}/lines`, 'POST', { productId: product.id, quantity: 1, unitPrice: amount, discountAmount: 0, taxAmount: 0 }), `Sales invoice ${invoiceSuffix} line`)
    return expectSuccessfulFixture(await authenticatedApi<Invoice>(page, `/sales-invoices/${invoice.id}`, 'PUT', { invoiceNumber, customerId: customer.id, invoiceDate: '2040-01-01', dueDate, status: ISSUED, currencyCode, isActive: true }), `Sales invoice ${invoiceSuffix} issue`)
  }
  const createPurchaseInvoice = async (invoiceSuffix: string, amount: number, currencyCode: string, dueDate: string) => {
    const invoiceNumber = `PI-${invoiceSuffix}-${suffix}`.slice(0, 50)
    const invoice = expectSuccessfulFixture(await authenticatedApi<Invoice>(page, '/purchase-invoices', 'POST', { invoiceNumber, supplierId: supplier.id, invoiceDate: '2040-01-01', dueDate, status: 1, currencyCode }), `Purchase invoice ${invoiceSuffix} creation`)
    expectSuccessfulFixture(await authenticatedApi(page, `/purchase-invoices/${invoice.id}/lines`, 'POST', { productId: product.id, quantity: 1, unitCost: amount, discountAmount: 0, taxAmount: 0 }), `Purchase invoice ${invoiceSuffix} line`)
    return expectSuccessfulFixture(await authenticatedApi<Invoice>(page, `/purchase-invoices/${invoice.id}`, 'PUT', { invoiceNumber, supplierId: supplier.id, invoiceDate: '2040-01-01', dueDate, status: ISSUED, currencyCode, isActive: true }), `Purchase invoice ${invoiceSuffix} issue`)
  }

  const sales = await createSalesInvoice('POST', 100, 'USD', '2040-06-10')
  const salesJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/sales-invoices/${sales.id}`, 'POST', { receivableAccountId: receivable.id, revenueAccountId: revenue.id, postingDate: sourcePostingDate }), 'Sales invoice posting')
  expect(salesJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'SalesInvoice', sourceDocumentId: sales.id, totalDebit: 100, totalCredit: 100 }))
  expect(salesJournal.lines).toEqual(expect.arrayContaining([
    expect.objectContaining({ accountId: receivable.id, debitAmount: 100, creditAmount: 0 }),
    expect.objectContaining({ accountId: revenue.id, debitAmount: 0, creditAmount: 100 }),
  ]))
  expect((await authenticatedApi(page, `/posting/sales-invoices/${sales.id}`, 'POST', { receivableAccountId: receivable.id, revenueAccountId: revenue.id, postingDate: sourcePostingDate })).status).toBe(409)

  const purchase = await createPurchaseInvoice('POST', 80, 'USD', '2040-05-15')
  const purchaseJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/purchase-invoices/${purchase.id}`, 'POST', { payableAccountId: payable.id, expenseAccountId: expense.id, postingDate: sourcePostingDate }), 'Purchase invoice posting')
  expect(purchaseJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'PurchaseInvoice', sourceDocumentId: purchase.id, totalDebit: 80, totalCredit: 80 }))
  expect((await authenticatedApi(page, `/posting/purchase-invoices/${purchase.id}`, 'POST', { payableAccountId: payable.id, expenseAccountId: expense.id, postingDate: sourcePostingDate })).status).toBe(409)

  const customerPayment = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/customer-payments', 'POST', { customerId: customer.id, salesInvoiceId: sales.id, paymentDate: date, amount: 40, currencyCode: 'USD', referenceNumber: `CP-${suffix}`.slice(0, 50), paymentMethod: 'Bank' }), 'Customer payment creation')
  const customerPaymentJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/customer-payments/${customerPayment.id}`, 'POST', { cashAccountId: cash.id, receivableAccountId: receivable.id, postingDate: sourcePostingDate }), 'Customer payment posting')
  expect(customerPaymentJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'CustomerPayment', sourceDocumentId: customerPayment.id, totalDebit: 40, totalCredit: 40 }))
  expect((await authenticatedApi(page, `/posting/customer-payments/${customerPayment.id}`, 'POST', { cashAccountId: cash.id, receivableAccountId: receivable.id, postingDate: sourcePostingDate })).status).toBe(409)

  const vendorPayment = expectSuccessfulFixture(await authenticatedApi<CreatedEntity>(page, '/vendor-payments', 'POST', { supplierId: supplier.id, purchaseInvoiceId: purchase.id, paymentDate: date, amount: 30, currencyCode: 'USD', referenceNumber: `VP-${suffix}`.slice(0, 50), paymentMethod: 'Bank' }), 'Vendor payment creation')
  const vendorPaymentJournal = expectSuccessfulFixture(await authenticatedApi<Journal>(page, `/posting/vendor-payments/${vendorPayment.id}`, 'POST', { payableAccountId: payable.id, cashAccountId: cash.id, postingDate: sourcePostingDate }), 'Vendor payment posting')
  expect(vendorPaymentJournal).toEqual(expect.objectContaining({ sourceDocumentType: 'VendorPayment', sourceDocumentId: vendorPayment.id, totalDebit: 30, totalCredit: 30 }))

  const currentSales = await createSalesInvoice('CURRENT-EUR', 25, 'EUR', '2040-07-15')
  const paidSales = await createSalesInvoice('PAID', 20, 'USD', '2040-04-01')
  expectSuccessfulFixture(await authenticatedApi(page, '/customer-payments', 'POST', { customerId: customer.id, salesInvoiceId: paidSales.id, paymentDate: date, amount: 20, currencyCode: 'USD', referenceNumber: `FULL-${suffix}`.slice(0, 50), paymentMethod: 'Cash' }), 'Full customer payment')
  const currentPurchase = await createPurchaseInvoice('CURRENT-EUR', 35, 'EUR', '2040-07-15')
  const paidPurchase = await createPurchaseInvoice('PAID', 15, 'USD', '2040-04-01')
  expectSuccessfulFixture(await authenticatedApi(page, '/vendor-payments', 'POST', { supplierId: supplier.id, purchaseInvoiceId: paidPurchase.id, paymentDate: date, amount: 15, currencyCode: 'USD', referenceNumber: `VFULL-${suffix}`.slice(0, 50), paymentMethod: 'Cash' }), 'Full vendor payment')

  const ar = expectSuccessfulFixture(await authenticatedApi<Aging<'customerId'>>(page, `/reports/ar-aging?asOfDate=${asOfDate}`, 'GET'), 'AR aging')
  const arUsd = ar.items.find((item) => item.customerId === customer.id && item.currencyCode === 'USD')
  const arEur = ar.items.find((item) => item.customerId === customer.id && item.currencyCode === 'EUR')
  expect(arUsd?.buckets).toEqual(expect.objectContaining({ due1To30: 60, total: 60 }))
  expect(arEur?.buckets).toEqual(expect.objectContaining({ current: currentSales.grandTotal, total: currentSales.grandTotal }))
  expect(ar.totals.total).toBe(85)
  const arCsv = await fetchText(page, `/reports/ar-aging/export?asOfDate=${asOfDate}`)
  expect(arCsv.status).toBe(200)
  expect(arCsv.text).toContain(',USD,0,60.00,0,0,0,60.00')
  expect(arCsv.text).toContain(',EUR,25.00,0,0,0,0,25.00')

  const ap = expectSuccessfulFixture(await authenticatedApi<Aging<'supplierId'>>(page, `/reports/ap-aging?asOfDate=${asOfDate}`, 'GET'), 'AP aging')
  const apUsd = ap.items.find((item) => item.supplierId === supplier.id && item.currencyCode === 'USD')
  const apEur = ap.items.find((item) => item.supplierId === supplier.id && item.currencyCode === 'EUR')
  expect(apUsd?.buckets).toEqual(expect.objectContaining({ due31To60: 50, total: 50 }))
  expect(apEur?.buckets).toEqual(expect.objectContaining({ current: currentPurchase.grandTotal, total: currentPurchase.grandTotal }))
  expect(ap.totals.total).toBe(85)
  const apCsv = await fetchText(page, `/reports/ap-aging/export?asOfDate=${asOfDate}`)
  expect(apCsv.status).toBe(200)
  expect(apCsv.text).toContain(',USD,0,0,50.00,0,0,50.00')
  expect(apCsv.text).toContain(',EUR,35.00,0,0,0,0,35.00')
})
