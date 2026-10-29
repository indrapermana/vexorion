import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../testUtils'
import { ProductCatalogPanel } from '../../components/pos/ProductCatalogPanel'

describe('ProductCatalogPanel accessibility', () => {
  const renderPanel = () => renderWithProviders(
    <ProductCatalogPanel
      selectedCustomerId="__guest__"
      selectedWarehouseId=""
      activeCustomerOptions={[]}
      warehouses={[]}
      products={[]}
      stockByProduct={{}}
      currencyCode="USD"
      notes=""
      onCustomerChange={vi.fn()}
      onWarehouseChange={vi.fn()}
      onOpenQuickCustomer={vi.fn()}
      onAddToCart={vi.fn()}
      onNotesChange={vi.fn()}
    />,
  )

  it('announces an empty catalog as status feedback', () => {
    renderPanel()

    expect(screen.getByRole('status')).toHaveTextContent('No products match the selected catalog/search.')
  })

  it('places scanner and product search before sale context controls', () => {
    renderPanel()

    const scanner = screen.getByLabelText(/scan \/ quick add/i)
    const search = screen.getByLabelText('Search')
    const customer = screen.getByLabelText('Customer')

    expect(scanner.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(search.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
