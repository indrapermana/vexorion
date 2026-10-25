import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SalesOrderLinesPanel from './SalesOrderLinesPanel'
import PurchaseOrderLinesPanel from '../../purchaseOrders/components/PurchaseOrderLinesPanel'
import SalesInvoiceLinesPanel from '../../salesInvoices/components/SalesInvoiceLinesPanel'
import PurchaseInvoiceLinesPanel from '../../purchaseInvoices/components/PurchaseInvoiceLinesPanel'
import type { SalesOrderGridRow, PurchaseOrderGridRow, SalesInvoiceGridRow, PurchaseInvoiceGridRow } from '../../../types/ui'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../../../app/CurrencyContext', () => ({ useCurrency: () => ({ formatMoney: (value: number) => `$${value.toFixed(2)}` }) }))
vi.mock('../../../hooks/useLookups', () => ({
  useProductsLookup: () => ({ items: [{ id: 'product-1', name: 'Widget', sku: 'W-1' }], error: null }),
  useWarehousesLookup: () => ({ items: [{ id: 'warehouse-1', name: 'Main warehouse' }], error: null }),
  useInventoryBalancesLookup: () => ({ items: [], error: null }),
}))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {} }))

const line = {
  id: 'line-1', productId: 'product-1', quantity: 2, unitPrice: 10, unitCost: 5,
  discountAmount: 0, taxAmount: 0, lineTotal: 20, isActive: true,
}

const cases = [
  {
    name: 'sales order', reason: 'orderWorkflow.lifecycle.orderLinesDraftOnly',
    render: () => <SalesOrderLinesPanel order={{ id: 'order-1', orderNumber: 'SO-1', status: 2, warehouseId: 'warehouse-1', customerId: 'customer-1', currencyCode: 'USD' } as SalesOrderGridRow} lines={[line as never]} isLoading={false} error={null} onRefresh={vi.fn()} canManage />,
  },
  {
    name: 'purchase order', reason: 'orderWorkflow.lifecycle.orderLinesDraftOnly',
    render: () => <PurchaseOrderLinesPanel order={{ id: 'order-1', orderNumber: 'PO-1', status: 2, warehouseId: 'warehouse-1', supplierId: 'supplier-1', currencyCode: 'USD' } as PurchaseOrderGridRow} lines={[line as never]} isLoading={false} error={null} onRefresh={vi.fn()} canManage />,
  },
  {
    name: 'sales invoice', reason: 'orderWorkflow.lifecycle.invoiceLinesDraftOnly',
    render: () => <SalesInvoiceLinesPanel invoice={{ id: 'invoice-1', invoiceNumber: 'SI-1', status: 2, customerId: 'customer-1', currencyCode: 'USD' } as SalesInvoiceGridRow} lines={[line as never]} isLoading={false} error={null} onRefresh={vi.fn()} canManage />,
  },
  {
    name: 'purchase invoice', reason: 'orderWorkflow.lifecycle.invoiceLinesDraftOnly',
    render: () => <PurchaseInvoiceLinesPanel invoice={{ id: 'invoice-1', invoiceNumber: 'PI-1', status: 2, supplierId: 'supplier-1', currencyCode: 'USD' } as PurchaseInvoiceGridRow} lines={[line as never]} isLoading={false} error={null} onRefresh={vi.fn()} canManage />,
  },
]

describe('document line mutation availability', () => {
  it.each(cases)('$name remains readable and explains why line editing is blocked outside Draft', ({ render: renderPanel, reason }) => {
    render(renderPanel())
    expect(screen.getByText('Widget (W-1)')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(reason)
    expect(screen.getByRole('button', { name: /orderWorkflow\.line\.add/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument()
  })
})