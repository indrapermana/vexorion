/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardChartsSection from './DashboardChartsSection'
import type { TFunction } from 'i18next'
import type { BalancePoint, CashFlowPoint } from '../types'

vi.mock('@mui/x-charts', () => ({
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
}))

const t = ((key: string) => key) as unknown as TFunction

const cashFlowData: CashFlowPoint[] = [
  { day: 1, inflow: 1000, outflow: 500 },
  { day: 2, inflow: 1500, outflow: 700 },
]

const balanceData: BalancePoint[] = [
  { name: 'Jan', open: 3000, overdue: 500 },
  { name: 'Feb', open: 4000, overdue: 200 },
]

describe('DashboardChartsSection', () => {
  it('renders the cash flow trends title', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashFlowChartData={cashFlowData}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getByText('dashboard.charts.cashFlowTrends')).toBeInTheDocument()
  })

  it('renders the receivables vs payables title', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashFlowChartData={cashFlowData}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getByText('dashboard.charts.receivablesVsPayables')).toBeInTheDocument()
  })

  it('renders a line chart and a bar chart', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashFlowChartData={cashFlowData}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
