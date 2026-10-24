/// <reference types="vitest/globals" />

import { fireEvent, render, screen, within } from '@testing-library/react'
import { Permissions } from '../app/authorization'
import type { FinanceDashboardSnapshotResponse } from '../types/api'
import DashboardPage from './DashboardPage'
import { useApAgingQuery, useArAgingQuery, useFinanceSnapshotQuery, useSalesOrdersQuery } from './dashboard/queries'

const state = vi.hoisted(() => ({ permissions: [] as string[], customersPending: false, snapshot: null as FinanceDashboardSnapshotResponse | null, financeError: false, arPending: false, storageConsumersError: false }))

vi.mock('../app/AuthContext', () => ({
  useAuth: () => ({ user: { tenantId: 'test-tenant', permissions: state.permissions } }),
}))

vi.mock('../app/CurrencyContext', () => ({
  useCurrency: () => ({ currencyCode: 'USD', formatMoney: (value: number) => `$${value}` }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'enUS' } }),
}))

vi.mock('@vexorion/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vexorion/ui')>()
  return { ...actual, VxBarChart: ({ dataset }: { dataset?: unknown }) => <div data-testid="chart">{JSON.stringify(dataset)}</div> }
})

vi.mock('./dashboard/queries', () => {
  const result = (data: unknown) => ({ data, isPending: false, isFetching: false, isError: false, dataUpdatedAt: 1792832400000, refetch: vi.fn().mockResolvedValue({}) })
  const totals = { current: 0, due1To30: 0, due31To60: 0, due61To90: 0, dueOver90: 0, total: 0 }
  return {
    useFinanceSnapshotQuery: vi.fn(() => ({ ...result(state.snapshot), isError: state.financeError })),
    useArAgingQuery: vi.fn(() => ({ ...result(state.arPending ? undefined : { totals, items: [] }), isPending: state.arPending })),
    useApAgingQuery: vi.fn(() => result({ totals, items: [] })),
    useSalesOrdersQuery: vi.fn(() => result([])),
    useCustomersQuery: vi.fn(() => ({ ...result(state.customersPending ? undefined : []), isPending: state.customersPending })),
    useTenantStorageSummaryQuery: vi.fn(() => result({ usedBytes: 0, usedPercent: 0, maxStorageBytes: 0 })),
    useTenantStorageTopConsumersQuery: vi.fn(() => ({ ...result(state.storageConsumersError ? undefined : { topProjects: [], topDocuments: [] }), isError: state.storageConsumersError })),
  }
})

describe('Dashboard hierarchy and filter scope', () => {
  beforeAll(async () => {
    await import('./dashboard/components/DashboardHealthSection')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    state.permissions = [Permissions.sales.view, Permissions.customers.view, Permissions.storageUsage.view]
    state.customersPending = false
    state.financeError = false
    state.arPending = false
    state.storageConsumersError = false
    state.snapshot = {
      asOfDate: '2026-10-24', periodStartDate: '2026-09-25', periodDays: 30,
      receivablesOpen: 0, receivablesOverdue: 0, payablesOpen: 0, payablesOverdue: 0,
      revenueInPeriod: 0, cashInInPeriod: 0, cashOutInPeriod: 0, netCashInPeriod: 0,
    }
  })

  it('keeps healthy sections visible and does not render zero finance cards after an initial finance failure', async () => {
    state.snapshot = null
    state.financeError = true
    render(<DashboardPage />)
    const metrics = screen.getByRole('region', { name: 'dashboard.query.financeMetrics' })
    expect(within(metrics).getByRole('alert')).toHaveTextContent('dashboard.query.failed')
    expect(within(metrics).queryByText('dashboard.summary.openReceivables')).not.toBeInTheDocument()
    expect(await screen.findByText('dashboard.aging.apTitle')).toBeInTheDocument()
    expect(await screen.findByText('dashboard.recentOrders.title')).toBeInTheDocument()
    expect(await screen.findByText('dashboard.storage.title')).toBeInTheDocument()
  })

  it('keeps payables aging visible while receivables aging loads', async () => {
    state.arPending = true
    render(<DashboardPage />)
    const receivables = await screen.findByRole('region', { name: 'dashboard.aging.arTitle' })
    expect(within(receivables).getByRole('status')).toBeInTheDocument()
    expect(within(receivables).queryByText('dashboard.aging.emptyAr')).not.toBeInTheDocument()
    expect(await screen.findByText('dashboard.aging.emptyAp')).toBeInTheDocument()
  })

  it('keeps storage usage visible when its top-consumer query fails', async () => {
    state.storageConsumersError = true
    render(<DashboardPage />)
    expect(await screen.findByText('dashboard.storage.title')).toBeInTheDocument()
    const consumers = await screen.findByRole('region', { name: 'dashboard.storage.topConsumers' })
    expect(within(consumers).getByRole('alert')).toBeInTheDocument()
    expect(within(consumers).queryByText('dashboard.storage.noDocumentData')).not.toBeInTheDocument()
  })

  it('keeps sales visible while permitted customer names are still loading', async () => {
    state.customersPending = true
    render(<DashboardPage />)
    expect(await screen.findByText('dashboard.recentOrders.empty')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'dashboard.query.customerNames' })).getByRole('status')).toBeInTheDocument()
  })

  it('does not add overdue amounts twice when calculating outstanding totals and current shares', async () => {
    state.snapshot = {
      asOfDate: '2026-10-24', periodStartDate: '2026-09-25', periodDays: 30,
      receivablesOpen: 10000, receivablesOverdue: 2000, payablesOpen: 5000, payablesOverdue: 1000,
      revenueInPeriod: 8000, cashInInPeriod: 7000, cashOutInPeriod: 3000, netCashInPeriod: 4000,
    }
    render(<DashboardPage />)
    const attention = await screen.findByRole('region', { name: 'dashboard.sections.attention' })
    await within(attention).findByText('dashboard.health.receivables', {}, { timeout: 5000 })
    expect(within(attention).getByText('$10000')).toBeInTheDocument()
    expect(within(attention).getByText('$5000')).toBeInTheDocument()
    expect(within(attention).getAllByText('80%')).toHaveLength(2)
    expect(within(attention).queryByText('$12000')).not.toBeInTheDocument()
    const indicators = await screen.findByRole('region', { name: 'dashboard.quickStats.title' })
    expect(within(indicators).getAllByText('80%')).toHaveLength(2)
    expect(within(indicators).getAllByText('20%')).toHaveLength(2)
    expect(within(indicators).getByText('$5000')).toBeInTheDocument()
    expect(screen.getByText(JSON.stringify([
      { name: 'dashboard.summary.receivables', open: 8000, overdue: 2000 },
      { name: 'dashboard.summary.payables', open: 4000, overdue: 1000 },
    ]))).toBeInTheDocument()
  })

  it('shows not-applicable shares rather than healthy or collection-rate claims for empty balances', async () => {
    render(<DashboardPage />)
    const indicators = await screen.findByRole('region', { name: 'dashboard.quickStats.title' })
    expect(within(indicators).getAllByText('dashboard.quickStats.notApplicable')).toHaveLength(4)
    expect(within(indicators).queryByText('dashboard.quickStats.good')).not.toBeInTheDocument()
    expect(within(indicators).queryByText('0%')).not.toBeInTheDocument()
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