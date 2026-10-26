import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InventoryReportsPage from './InventoryReportsPage'

const api = vi.hoisted(() => ({
  getInventoryMovementAuditReport: vi.fn(),
  getInventoryReorderReport: vi.fn(),
  getInventoryValuationReport: vi.fn(),
}))

vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('../../../hooks/useLookups', () => ({ useWarehousesLookup: () => ({ items: [{ id: 'warehouse-1', name: 'Main warehouse' }], error: null }) }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, number>) => values ? `${key} ${Object.values(values).join(' ')}` : key, i18n: { language: 'enUS' } }) }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><InventoryReportsPage /></QueryClientProvider>)
}

describe('InventoryReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getInventoryValuationReport.mockResolvedValue({
      totalEstimatedValue: 15,
      reconciledItemCount: 0,
      unreconciledItemCount: 1,
      items: [{
        productId: 'product-1', sku: 'SKU-1', productName: 'Widget', unitOfMeasure: 'EA',
        warehouseId: 'warehouse-1', warehouseCode: 'MAIN', warehouseName: 'Main warehouse',
        quantityOnHand: 6, currentStandardCost: 2.5, estimatedValue: 15, ledgerNetQuantity: 7,
        balanceToLedgerVariance: -1,
      }],
    })
    api.getInventoryMovementAuditReport.mockResolvedValue({
      skip: 0, take: 50, totalCount: 1,
      items: [{
        id: 'movement-1', createdAtUtc: '2026-10-25T09:00:00Z', movementType: 'PurchaseReceipt',
        productId: 'product-1', sku: 'SKU-1', productName: 'Widget', warehouseId: 'warehouse-1',
        warehouseCode: 'MAIN', warehouseName: 'Main warehouse', quantity: 2,
        quantityOnHandDelta: 2, quantityReservedDelta: 0, referenceNumber: 'RCV-1',
        sourceDocumentType: 'PurchaseReceipt', sourceDocumentId: 'receipt-1',
      }],
    })
    api.getInventoryReorderReport.mockResolvedValue({
      recommendationCount: 1,
      items: [{ productId: 'product-1', sku: 'SKU-1', productName: 'Widget', unitOfMeasure: 'EA', activeWarehouseAvailable: 4, reorderLevel: 8, suggestedReorderQuantity: 4 }],
    })
  })

  it('shows valuation at standard cost and the balance-to-ledger variance', async () => {
    renderPage()

    expect(await screen.findByText('SKU-1 · Widget')).toBeInTheDocument()
    expect(screen.getByText('pages.inventoryReports.valuation.standardCostNote')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === 'pages.inventoryReports.valuation.unreconciledItems: 1')).toBeInTheDocument()
    expect(api.getInventoryValuationReport).toHaveBeenCalled()
  })

  it('loads movement audit and reorder recommendations through their report tabs', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'pages.inventoryReports.tabs.movementAudit' }))
    expect(await screen.findByText('pages.inventoryReports.movementAudit.sourceTypes.PurchaseReceipt: RCV-1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'pages.inventoryReports.tabs.reorder' }))
    expect(await screen.findByText('pages.inventoryReports.reorder.summary 1')).toBeInTheDocument()
    expect(screen.getByText('SKU-1 · Widget')).toBeInTheDocument()
  })

  it('explains an inverted movement date range without querying it', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'pages.inventoryReports.tabs.movementAudit' }))
    await screen.findByText('pages.inventoryReports.movementAudit.sourceTypes.PurchaseReceipt: RCV-1')

    fireEvent.change(screen.getByLabelText('pages.inventoryReports.filters.endDate'), { target: { value: '2026-01-01' } })

    expect(await screen.findByText('pages.inventoryReports.validation.dateOrder')).toBeInTheDocument()
    expect(api.getInventoryMovementAuditReport).not.toHaveBeenCalledWith(expect.objectContaining({ endDate: '2026-01-01' }))
  })
})