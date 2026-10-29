import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent } from '../testUtils'
import { ProductCatalogPanel } from '../../components/pos/ProductCatalogPanel'
import type { ComponentProps } from 'react'

describe('ProductCatalogPanel accessibility', () => {
  const renderPanel = (overrides: Partial<ComponentProps<typeof ProductCatalogPanel>> = {}) => {
    const props: ComponentProps<typeof ProductCatalogPanel> = {
      selectedCustomerId: '__guest__',
      selectedWarehouseId: '',
      activeCustomerOptions: [],
      warehouses: [],
      products: [],
      stockByProduct: {},
      currencyCode: 'USD',
      notes: '',
      isLoading: false,
      hasLoadError: false,
      onCustomerChange: vi.fn(),
      onWarehouseChange: vi.fn(),
      onOpenQuickCustomer: vi.fn(),
      onAddToCart: vi.fn(),
      onNotesChange: vi.fn(),
      onRetryLoad: vi.fn(),
      ...overrides,
    }

    return { props, ...renderWithProviders(<ProductCatalogPanel {...props} />) }
  }

  it('announces an empty catalog as status feedback', () => {
    renderPanel()

    expect(screen.getByRole('status')).toHaveTextContent('No active products are available for this register')
  })

  it('places scanner and product search before sale context controls', () => {
    renderPanel()

    const scanner = screen.getByLabelText(/scan \/ quick add/i)
    const search = screen.getByLabelText('Search')
    const customer = screen.getByLabelText('Customer')

    expect(scanner.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(search.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('distinguishes loading from an empty configured catalog', () => {
    renderPanel({ isLoading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Loading products and stock')
    expect(screen.queryByText(/No active products are available/)).not.toBeInTheDocument()
  })

  it('explains reference-data failures and offers a retry', async () => {
    const onRetryLoad = vi.fn()
    const user = userEvent.setup()
    renderPanel({ hasLoadError: true, onRetryLoad })

    expect(screen.getByRole('alert')).toHaveTextContent('Products or stock could not be loaded')
    await user.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(onRetryLoad).toHaveBeenCalledOnce()
  })
})
