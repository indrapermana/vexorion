import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, fireEvent, userEvent } from '../testUtils'

// ---------------------------------------------------------------------------
// Mock the barrel API module BEFORE importing the component under test.
// The component imports from '../../lib/api' (the barrel index).
// ---------------------------------------------------------------------------
vi.mock('../../lib/api', () => ({
  getSalesInvoices: vi.fn(),
  getSalesInvoiceLines: vi.fn(),
  getPosRefundEligibleLines: vi.fn(),
  refundSale: vi.fn(),
}))

import ReturnRefundDialog from '../../components/pos/ReturnRefundDialog'
import * as api from '../../lib/api'
import type { SalesInvoiceListItemResponse } from '../../types/api'

function makeInvoice(overrides: Partial<SalesInvoiceListItemResponse> = {}): SalesInvoiceListItemResponse {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    customerId: 'cust-1',
    invoiceDate: '2026-05-01T00:00:00.000Z',
    currencyCode: 'USD',
    grandTotal: 200,
    paidTotal: 200,
    balanceDue: 0,
    isActive: true,
    ...overrides,
  }
}

const BASE_PROPS = {
  open: true,
  currencyCode: 'USD',
  products: [],
  cashierId: 'user-1',
  cashierName: 'Alice',
  shiftId: 'shift-1',
  onClose: vi.fn(),
}

const invoiceLine = {
  id: 'line-1',
  salesInvoiceId: 'inv-1',
  productId: 'product-1',
  quantity: 2,
  unitPrice: 10,
  discountAmount: 0,
  taxAmount: 0,
  lineTotal: 20,
  isActive: true,
}

const eligibleLines = {
  salesInvoiceId: 'inv-1',
  lines: [{
    salesInvoiceLineId: 'line-1',
    quantitySold: 2,
    quantityReturned: 0,
    quantityRemaining: 2,
    canReturnToStock: true,
  }],
}

describe('ReturnRefundDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('renders the search step initially', () => {
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Search input should be visible
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows not-found message when no invoice matches the search', async () => {
    vi.mocked(api.getSalesInvoices).mockResolvedValueOnce([] as never)

    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'INV-9999-XYZ' } })

    const searchBtn = screen.getByRole('button', { name: /search|cari|buscar/i })
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(screen.getByText(/no invoice found/i)).toBeInTheDocument()
    })
  })

  it('calls getSalesInvoices when search button is clicked', async () => {
    vi.mocked(api.getSalesInvoices).mockResolvedValueOnce([makeInvoice()] as never)
    vi.mocked(api.getSalesInvoiceLines).mockResolvedValueOnce([invoiceLine] as never)
    vi.mocked(api.getPosRefundEligibleLines).mockResolvedValueOnce(eligibleLines as never)

    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'INV-2026-001' } })
    fireEvent.click(screen.getByRole('button', { name: /search|cari|buscar/i }))

    await waitFor(() => {
      expect(api.getSalesInvoices).toHaveBeenCalledOnce()
    })
  })

  it('submits one atomic refund request and reuses its idempotency key after an unknown outcome', async () => {
    vi.mocked(api.getSalesInvoices).mockResolvedValue([makeInvoice()] as never)
    vi.mocked(api.getSalesInvoiceLines).mockResolvedValue([invoiceLine] as never)
    vi.mocked(api.getPosRefundEligibleLines).mockResolvedValue(eligibleLines as never)
    vi.mocked(api.refundSale)
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce({
        refundId: 'refund-1',
        salesInvoiceId: 'inv-1',
        creditNoteId: 'credit-1',
        refundPaymentId: 'payment-1',
        creditNoteNumber: 'CR-POS-1',
        currencyCode: 'USD',
        totalCreditAmount: 10,
        refundAmount: 10,
        appliedCreditAmount: 10,
        paymentMethod: 'CASH',
        completedAtUtc: new Date().toISOString(),
        replayed: true,
        lines: [],
      })

    const { unmount } = renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'INV-2026-001' } })
    fireEvent.click(screen.getByRole('button', { name: /search|cari|buscar/i }))
    await screen.findByText('Qty remaining')
    expect(screen.getByText(/confirming creates a credit note/i)).toBeInTheDocument()
    const quantityInput = screen.getByRole('spinbutton', { name: /return qty:/i })
    fireEvent.change(quantityInput, { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm return|konfirmasi retur|confirmar devolucion/i }))

    await screen.findByText(/could not confirm whether this return completed/i)
    unmount()
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    fireEvent.click(await screen.findByRole('button', { name: /retry same return|ulangi retur yang sama|reintentar la misma devolucion/i }))

    await screen.findByText(/CR-POS-1/)
    expect(api.refundSale).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.refundSale).mock.calls[0][0]).toEqual(
      expect.objectContaining({ shiftId: 'shift-1', salesInvoiceId: 'inv-1' }),
    )
    expect(vi.mocked(api.refundSale).mock.calls[1][0].idempotencyKey)
      .toBe(vi.mocked(api.refundSale).mock.calls[0][0].idempotencyKey)
  })

  it('calls onClose when the Cancel / X button is clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} onClose={onClose} />)
    // Click the Cancel button (search step has a cancel/close action)
    const cancelBtn = screen.getByRole('button', { name: /cancel|close|tutup|batal|cerrar/i })
    cancelBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes from the keyboard while search is active', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} onClose={onClose} />)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })
})
