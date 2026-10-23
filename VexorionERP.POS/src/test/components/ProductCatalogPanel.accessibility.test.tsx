import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../testUtils'
import { ProductCatalogPanel } from '../../components/pos/ProductCatalogPanel'

describe('ProductCatalogPanel accessibility', () => {
  it('announces an empty catalog as status feedback', () => {
    renderWithProviders(
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

    expect(screen.getByRole('status')).toHaveTextContent('No products match the selected catalog/search.')
  })
})
