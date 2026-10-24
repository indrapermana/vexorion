/// <reference types="vitest/globals" />

import { fireEvent, render, screen, within } from '@testing-library/react'
import { Permissions } from '../app/authorization'
import DashboardPage from './DashboardPage'
import { useApAgingQuery, useArAgingQuery, useFinanceSnapshotQuery, useSalesOrdersQuery } from './dashboard/queries'

const state = vi.hoisted(() => ({ permissions: [] as string[], customersPending: false }))

vi.mock('../app/AuthContext', () => ({
  useAuth: () => ({ user: { tenantId: 'test-tenant', permissions: state.permissions } }),
}))

vi.mock('../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (value: number) => `$${value}` }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@vexorion/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vexorion/ui')>()
  return { ...actual, VxBarChart: () => <div data-testid="chart" /> }
})

vi.mock('./dashboard/queries', () => ({
  useFinanceSnapshotQuery: vi.fn(() => ({ data: null, isPending: false })),
  useArAgingQuery: vi.fn(() => ({ data: null, isPending: false })),
  useApAgingQuery: vi.fn(() => ({ data: null, isPending: false })),
  useSalesOrdersQuery: vi.fn(() => ({ data: [], isPending: false })),
  useCustomersQuery: vi.fn(() => ({ data: [], isPending: state.customersPending })),
  useTenantStorageSummaryQuery: vi.fn(() => ({ data: null, isPending: false })),
  useTenantStorageTopConsumersQuery: vi.fn(() => ({ data: null, isPending: false })),
}))

describe('Dashboard hierarchy and filter scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.permissions = [Permissions.sales.view, Permissions.customers.view, Permissions.storageUsage.view]
    state.customersPending = false
  })

  it('orders overview, overdue attention, analysis, and recent activity before storage', async () => {
    render(<DashboardPage />)
    await screen.findByText('dashboard.storage.title')

    const sections = ['overview', 'attention', 'analysis', 'activity'].map((name) => (
      screen.getByRole('region', { name: `dashboard.sections.${name}` })
    ))
    for (let index = 1; index < sections.length; index += 1) {
      expect(sections[index - 1].compareDocumentPosition(sections[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(sections[3].compareDocumentPosition(screen.getByText('dashboard.storage.title')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(sections[1]).getByText('dashboard.health.receivables')).toBeInTheDocument()
    expect(within(sections[3]).getByText('dashboard.recentOrders.title')).toBeInTheDocument()
  })

  it('keeps controls in finance and updates only date-dependent finance queries', async () => {
    render(<DashboardPage />)
    const finance = await screen.findByRole('region', { name: 'dashboard.sections.finance' })
    const date = await within(finance).findByLabelText('dashboard.filters.asOfDate')
    const activity = await screen.findByRole('region', { name: 'dashboard.sections.activity' })
    expect(within(activity).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(activity).queryByLabelText('dashboard.filters.asOfDate')).not.toBeInTheDocument()

    fireEvent.change(date, { target: { value: '2026-10-01' } })
    fireEvent.change(within(finance).getByLabelText('dashboard.filters.window'), { target: { value: '90' } })

    expect(useFinanceSnapshotQuery).toHaveBeenLastCalledWith('2026-10-01', 90)
    expect(useArAgingQuery).toHaveBeenLastCalledWith('2026-10-01')
    expect(useApAgingQuery).toHaveBeenLastCalledWith('2026-10-01')
    expect(useSalesOrdersQuery).toHaveBeenLastCalledWith(true)
  })

  it('omits sales and storage sections when their permissions are absent', async () => {
    state.permissions = []
    render(<DashboardPage />)
    await screen.findByText('dashboard.charts.cashFlowPeriod')
    expect(screen.queryByRole('region', { name: 'dashboard.sections.activity' })).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.storage.title')).not.toBeInTheDocument()
    expect(useSalesOrdersQuery).toHaveBeenLastCalledWith(false)
  })

  it('renders sales activity without waiting on a disabled customer query', async () => {
    state.permissions = [Permissions.sales.view]
    state.customersPending = true
    render(<DashboardPage />)
    expect(await screen.findByText('dashboard.recentOrders.empty')).toBeInTheDocument()
  })
})