import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  permissions: [] as string[],
  getSalesOrders: vi.fn(),
  reloadCustomers: vi.fn(),
  reloadWarehouses: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { requiredPermission?: string }) => (
      key === 'authorization.readOnly' ? `Read only: ${options?.requiredPermission}` : key
    ),
  }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { permissions: testState.permissions } }),
}))

vi.mock('../../../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (value: number) => String(value) }),
}))

vi.mock('../../../hooks/useLookups', () => ({
  useCustomersLookup: () => ({ items: [], error: null, reload: testState.reloadCustomers }),
  useWarehousesLookup: () => ({ items: [], error: null, reload: testState.reloadWarehouses }),
}))

vi.mock('../../../lib/api', () => ({
  getSalesOrder: vi.fn(),
  getSalesOrders: testState.getSalesOrders,
  getSalesOrderLines: vi.fn(),
  deleteSalesOrder: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../../components/DocumentsPanel', () => ({ default: () => null }))
vi.mock('../components/SalesOrderDataGrid', () => ({
  default: ({ canManage }: { canManage?: boolean }) => <div data-testid="sales-grid" data-can-manage={String(canManage)} />,
}))
vi.mock('../components/SalesOrderLinesPanel', () => ({
  default: ({ canManage }: { canManage?: boolean }) => <div data-testid="sales-lines" data-can-manage={String(canManage)} />,
}))
vi.mock('../components/SalesOrderEditorDialog', () => ({ default: () => <div>Sales order editor</div> }))
vi.mock('../components/SalesOrderDeleteDialog', () => ({ default: () => <div>Sales order delete</div> }))

import SalesOrdersPage from './SalesOrdersPage'

describe('SalesOrdersPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.getSalesOrders.mockResolvedValue([])
    testState.reloadCustomers.mockResolvedValue(undefined)
    testState.reloadWarehouses.mockResolvedValue(undefined)
  })

  function renderPage() {
    return render(<MemoryRouter><SalesOrdersPage /></MemoryRouter>)
  }

  it('retains browsing and line inspection while hiding sales mutations for viewers', async () => {
    testState.permissions = ['sales.view']
    renderPage()

    await waitFor(() => expect(testState.getSalesOrders).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: 'pages.salesOrders.newButton' })).not.toBeInTheDocument()
    expect(screen.getByText('Read only: sales.manage')).toBeInTheDocument()
    expect(screen.getByTestId('sales-grid')).toHaveAttribute('data-can-manage', 'false')
    expect(screen.getByTestId('sales-lines')).toHaveAttribute('data-can-manage', 'false')
  })

  it('enables header and line mutations for sales managers', async () => {
    testState.permissions = ['sales.view', 'sales.manage']
    renderPage()

    await waitFor(() => expect(testState.getSalesOrders).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'pages.salesOrders.newButton' })).toBeInTheDocument()
    expect(screen.getByTestId('sales-grid')).toHaveAttribute('data-can-manage', 'true')
    expect(screen.getByTestId('sales-lines')).toHaveAttribute('data-can-manage', 'true')
  })
})
