/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import ProductDataGrid from './ProductDataGrid'
import type { ProductGridRow } from '../../../types/ui'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (amount: number) => `$${amount.toFixed(2)}` }),
}))

vi.mock('./ProductExpandedPanel', () => ({ default: () => null }))
vi.mock('./ProductPurchasePriceCell', () => ({ default: () => null }))

const product: ProductGridRow = {
  id: 'product-1',
  sku: 'SKU-1',
  name: 'Sample product',
  unitOfMeasure: 'each',
  standardCost: 5,
  salesPrice: 10,
  reorderLevel: 2,
  isActive: true,
  quantityOnHand: 5,
  quantityReserved: 1,
  quantityAvailable: 4,
  activeQuantityOnHand: 5,
  activeQuantityReserved: 1,
  activeQuantityAvailable: 4,
  isLowStock: false,
  warehouseStock: [],
}

describe('ProductDataGrid accessibility', () => {
  it('identifies expand, edit, and delete controls by product name', () => {
    render(
      <ProductDataGrid
        rows={[product]}
        isLoading={false}
        expandedProductIds={[]}
        onToggleExpanded={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'components.products.grid.expand: Sample product' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.edit: Sample product' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'dialogs.delete: Sample product' })).toBeInTheDocument()
  })
})
