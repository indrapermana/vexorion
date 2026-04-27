import { render, screen } from '@testing-library/react'
import DashboardQuickStatsSection from './DashboardQuickStatsSection'
import DashboardRecentOrdersSection from './DashboardRecentOrdersSection'
import DashboardTopCustomersSection from './DashboardTopCustomersSection'
import type { QuickStat, RecentOrderView, TopCustomerView } from '../types'

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'dashboard.topCustomers.totalCustomers') return `${options?.count ?? 0} customers`
  if (key === 'dashboard.recentOrders.totalOrders') return `${options?.count ?? 0} orders`
  return key
}) as never

describe('Dashboard section smoke tests', () => {
  it('renders top customers table with values', () => {
    const data: TopCustomerView[] = [
      {
        id: 'row-1',
        rank: 1,
        customerLabel: 'Acme Corp',
        orderReference: 'SO-001',
        amount: 1500,
      },
    ]

    render(<DashboardTopCustomersSection t={t} topCustomers={data} />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('SO-001')).toBeInTheDocument()
    expect(screen.getByText('1 customers')).toBeInTheDocument()
  })

  it('renders recent orders table with status chips', () => {
    const data: RecentOrderView[] = [
      {
        id: 'order-1',
        orderReference: 'SO-1001',
        customerLabel: 'Northwind',
        orderDateLabel: '4/27/2026',
        status: 2,
        statusLabel: 'Confirmed',
        amount: 2000,
      },
    ]

    render(<DashboardRecentOrdersSection t={t} recentOrders={data} />)

    expect(screen.getByText('SO-1001')).toBeInTheDocument()
    expect(screen.getByText('Northwind')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('1 orders')).toBeInTheDocument()
  })

  it('renders quick stats labels and values', () => {
    const stats: QuickStat[] = [
      { label: 'AR Collection Rate', value: '91%', trend: 'positive' },
      { label: 'Working Capital', value: '$2,300.00', trend: 'negative' },
    ]

    render(<DashboardQuickStatsSection t={t} quickStats={stats} />)

    expect(screen.getByText('AR Collection Rate')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('Working Capital')).toBeInTheDocument()
    expect(screen.getByText('$2,300.00')).toBeInTheDocument()
  })
})
