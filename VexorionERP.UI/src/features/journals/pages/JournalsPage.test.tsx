import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JournalsPage from './JournalsPage'

const api = vi.hoisted(() => ({
  createManualJournal: vi.fn(),
  getAccounts: vi.fn(),
  getJournal: vi.fn(),
  getJournals: vi.fn(),
  getPurchaseInvoices: vi.fn(),
  getSalesInvoices: vi.fn(),
  postManualJournal: vi.fn(),
  postPurchaseInvoice: vi.fn(),
  postSalesInvoice: vi.fn(),
  reverseJournal: vi.fn(),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { permissions: ['billing.manage', 'sales.view', 'purchasing.view'] } }),
}))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => values && Object.keys(values).some((name) => name !== 'defaultValue')
      ? `${key}: ${Object.entries(values).filter(([name]) => name !== 'defaultValue').map(([, value]) => value).join(' ')}`
      : key,
  }),
}))
vi.mock('../components/JournalDataGrid', () => ({
  default: ({ rows, onOpen }: { rows: Array<{ id: string }>, onOpen: (id: string) => void }) => (
    <button type="button" disabled={!rows.length} onClick={() => onOpen(rows[0]?.id ?? '')}>Open first journal</button>
  ),
}))

describe('JournalsPage source selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getJournals.mockResolvedValue([{
      id: 'journal-posted',
      journalNumber: 'JRN-POSTED',
      sourceDocumentType: 'SalesInvoice',
      sourceDocumentId: 'sales-posted',
      postingDate: '2026-10-01',
      status: 2,
      totalDebit: 100,
      totalCredit: 100,
    }])
    api.getJournal.mockResolvedValue({
      id: 'journal-posted', journalNumber: 'JRN-POSTED', sourceDocumentType: 'SalesInvoice',
      sourceDocumentId: 'sales-posted', postingDate: '2026-10-01', status: 2,
      totalDebit: 100, totalCredit: 100, fiscalPeriodId: 'period-1', description: 'Post sales invoice SI-POSTED',
      lines: [],
    })
    api.getAccounts.mockResolvedValue([])
    api.getSalesInvoices.mockResolvedValue([
      { id: 'sales-ready', invoiceNumber: 'SI-READY', invoiceDate: '2026-10-02', status: 2, currencyCode: 'USD', grandTotal: 75, isActive: true },
      { id: 'sales-draft', invoiceNumber: 'SI-DRAFT', invoiceDate: '2026-10-03', status: 1, currencyCode: 'USD', grandTotal: 50, isActive: true },
      { id: 'sales-cancelled', invoiceNumber: 'SI-CANCELLED', invoiceDate: '2026-10-04', status: 6, currencyCode: 'USD', grandTotal: 40, isActive: true },
      { id: 'sales-posted', invoiceNumber: 'SI-POSTED', invoiceDate: '2026-10-01', status: 2, currencyCode: 'USD', grandTotal: 100, isActive: true },
    ])
    api.getPurchaseInvoices.mockResolvedValue([
      { id: 'purchase-ready', invoiceNumber: 'PI-READY', invoiceDate: '2026-10-02', status: 2, currencyCode: 'USD', grandTotal: 60, isActive: true },
    ])
  })

  it('offers contextual searchable invoice options and omits draft, cancelled, and already-posted invoices', async () => {
    render(<JournalsPage />)

    await waitFor(() => expect(api.getSalesInvoices).toHaveBeenCalled())
    expect(screen.queryByLabelText('pages.journals.fields.salesInvoiceId')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('pages.journals.fields.purchaseInvoiceId')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('pages.journals.fields.journalEntryId')).not.toBeInTheDocument()

    const salesInput = screen.getByRole('combobox', { name: 'pages.journals.fields.salesInvoice' })
    fireEvent.mouseDown(salesInput)
    fireEvent.change(salesInput, { target: { value: 'SI-' } })

    const readyOption = await screen.findByRole('option', { name: /SI-READY/ })
    expect(readyOption).toHaveTextContent('2026-10-02')
    expect(readyOption).toHaveTextContent('USD 75.00')
    expect(readyOption).toHaveTextContent('common.invoiceStatuses.2')
    expect(screen.queryByRole('option', { name: /SI-DRAFT/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /SI-CANCELLED/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /SI-POSTED/ })).not.toBeInTheDocument()

    fireEvent.keyDown(salesInput, { key: 'Escape' })
    const purchaseInput = screen.getByRole('combobox', { name: 'pages.journals.fields.purchaseInvoice' })
    fireEvent.mouseDown(purchaseInput)
    fireEvent.change(purchaseInput, { target: { value: 'PI-' } })
    expect(await screen.findByRole('option', { name: /PI-READY/ })).toBeInTheDocument()
  })

  it('reverses the selected posted journal and shows invoice context without exposing its source GUID', async () => {
    render(<JournalsPage />)
    const openJournal = await screen.findByRole('button', { name: 'Open first journal' })
    await waitFor(() => expect(openJournal).toBeEnabled())
    fireEvent.click(openJournal)

    expect(await screen.findByText('pages.journals.details.title: JRN-POSTED')).toBeInTheDocument()
    expect(screen.getByText('pages.journals.details.source: pages.journals.sourceTypes.SalesInvoice · SI-POSTED')).toBeInTheDocument()
    expect(screen.queryByText(/sales-posted/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'pages.journals.actions.reverseJournal' }))
    fireEvent.click(await screen.findByRole('button', { name: 'pages.journals.actions.confirmReverse' }))

    await waitFor(() => expect(api.reverseJournal).toHaveBeenCalledWith('journal-posted', expect.objectContaining({ reversalDate: expect.any(String) })))
  })
})