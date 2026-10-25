import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductPurchaseHistoryPanel from './ProductPurchaseHistoryPanel'

const api = vi.hoisted(() => ({ getProductPurchasePriceHistoryEntries: vi.fn() }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { count?: number }) => key === 'components.products.purchaseHistory.showingRecent' ? `Showing ${values?.count}` : key, i18n: { resolvedLanguage: 'enUS' } }) }))

const entry = {
  purchaseInvoiceLineId: 'line-1', purchaseInvoiceId: 'invoice-1', supplierId: 'supplier-1',
  supplierNumber: 'SUP-1', supplierName: 'Supplier One', unitCost: 12.5, quantity: 4,
  invoiceDate: '2026-10-24', invoiceNumber: 'PINV-1', currencyCode: 'EUR',
}

describe('ProductPurchaseHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getProductPurchasePriceHistoryEntries.mockResolvedValue([entry])
  })

  it('shows dated supplier invoice entries and preserves each invoice currency', async () => {
    render(<ProductPurchaseHistoryPanel productId="product-1" />)
    expect(await screen.findByText('Supplier One')).toBeInTheDocument()
    expect(screen.getByText('PINV-1')).toBeInTheDocument()
    expect(screen.getByText('12.50 EUR')).toBeInTheDocument()
    expect(screen.getByText('components.products.purchaseHistory.scope')).toBeInTheDocument()
    expect(api.getProductPurchasePriceHistoryEntries).toHaveBeenCalledWith('product-1', expect.any(String))
  })

  it('shows an honest empty state when there is no recent purchase history', async () => {
    api.getProductPurchasePriceHistoryEntries.mockResolvedValueOnce([])
    render(<ProductPurchaseHistoryPanel productId="product-1" />)
    await waitFor(() => {
      expect(screen.getByText('components.products.purchaseHistory.empty')).toBeInTheDocument()
    })
  })

  it('retries after a history load failure', async () => {
    api.getProductPurchasePriceHistoryEntries.mockRejectedValue(new Error('unavailable'))
    render(<ProductPurchaseHistoryPanel productId="product-1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('components.products.purchaseHistory.loadError')
    api.getProductPurchasePriceHistoryEntries.mockResolvedValue([entry])
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    await waitFor(() => expect(screen.getByText('Supplier One')).toBeInTheDocument())
    expect(api.getProductPurchasePriceHistoryEntries.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
