import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductDetailsPanel from './ProductDetailsPanel'
import type { ProductGridRow } from '../../../types/ui'

const api = vi.hoisted(() => ({ getProduct: vi.fn() }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('../../../app/CurrencyContext', () => ({ useCurrency: () => ({ formatMoney: (amount: number) => `$${amount.toFixed(2)}` }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { name?: string }) => key === 'components.products.details.imageAlt' ? `${values?.name} image` : key }) }))

const row: ProductGridRow = {
  id: 'product-1', sku: 'SKU-1', name: 'Product One', imageUrl: 'https://example.test/image.png', unitOfMeasure: 'EA',
  standardCost: 5, salesPrice: 10, reorderLevel: 2, isActive: true,
  quantityOnHand: 4, quantityReserved: 1, quantityAvailable: 3,
  activeQuantityOnHand: 4, activeQuantityReserved: 1, activeQuantityAvailable: 3,
  isLowStock: false, warehouseStock: [],
}

describe('ProductDetailsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getProduct.mockResolvedValue({ ...row, tenantId: 'tenant-1', description: 'Product description' })
  })

  it('presents core product data, image, prices, and an edit action in one detail panel', async () => {
    const onEdit = vi.fn()
    render(<ProductDetailsPanel row={row} canManage onEdit={onEdit} />)
    expect(await screen.findByRole('heading', { name: 'Product One' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Product One image' })).toHaveAttribute('src', row.imageUrl)
    expect(screen.getByText('Product description')).toBeInTheDocument()
    expect(screen.getByText('SKU-1')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    expect(onEdit).toHaveBeenCalledWith('product-1')
  })

  it('keeps the detail panel recoverable after a load failure', async () => {
    api.getProduct.mockRejectedValue(new Error('unavailable'))
    render(<ProductDetailsPanel row={row} canManage={false} onEdit={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('components.products.details.loadError')
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument()
    api.getProduct.mockResolvedValue({ ...row, tenantId: 'tenant-1', description: null })
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    await waitFor(() => expect(screen.getByText('components.products.details.noDescription')).toBeInTheDocument())
    expect(api.getProduct.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})