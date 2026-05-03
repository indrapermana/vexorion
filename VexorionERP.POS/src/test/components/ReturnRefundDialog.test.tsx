import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, fireEvent } from '../testUtils'

// ---------------------------------------------------------------------------
// Mock the barrel API module BEFORE importing the component under test.
// The component imports from '../../lib/api' (the barrel index).
// ---------------------------------------------------------------------------
vi.mock('../../lib/api', () => ({
  getSalesInvoices: vi.fn(),
  getSalesInvoiceLines: vi.fn(),
  createSalesInvoice: vi.fn(),
  createSalesInvoiceLine: vi.fn(),
  createCustomerPayment: vi.fn(),
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
  onClose: vi.fn(),
}

describe('ReturnRefundDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(api.getSalesInvoiceLines).mockResolvedValueOnce([] as never)

    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'INV-2026-001' } })
    fireEvent.click(screen.getByRole('button', { name: /search|cari|buscar/i }))

    await waitFor(() => {
      expect(api.getSalesInvoices).toHaveBeenCalledOnce()
    })
  })

  it('calls onClose when the Cancel / X button is clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(<ReturnRefundDialog {...BASE_PROPS} onClose={onClose} />)
    // Click the Cancel button (search step has a cancel/close action)
    const cancelBtn = screen.getByRole('button', { name: /cancel|close|tutup|batal|cerrar/i })
    cancelBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
