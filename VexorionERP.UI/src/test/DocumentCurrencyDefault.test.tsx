/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import PurchaseOrderEditorDialog from '../features/purchaseOrders/components/PurchaseOrderEditorDialog'
import SalesOrderEditorDialog from '../features/salesOrders/components/SalesOrderEditorDialog'

const stableT = (key: string) => key

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
}))

vi.mock('../app/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'IDR', formatMoney: (value: number) => String(value) }),
}))

describe('new document currency default', () => {
  it('defaults a new purchase order to the company currency', () => {
    render(<PurchaseOrderEditorDialog open mode="create" suppliers={[]} warehouses={[]} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByDisplayValue('IDR')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('USD')).not.toBeInTheDocument()
  })

  it('defaults a new sales order to the company currency', () => {
    render(<SalesOrderEditorDialog open mode="create" customers={[]} warehouses={[]} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByDisplayValue('IDR')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('USD')).not.toBeInTheDocument()
  })
})
