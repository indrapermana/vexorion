/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardChartsSection from './DashboardChartsSection'
import type { TFunction } from 'i18next'
import type { BalancePoint } from '../types'

vi.mock('@vexorion/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vexorion/ui')>()
  return {
    ...actual,
    VxBarChart: ({ series }: { series: unknown }) => <div data-testid="bar-chart">{JSON.stringify(series)}</div>,
  }
})

const t = ((key: string) => key) as unknown as TFunction

const balanceData: BalancePoint[] = [
  { name: 'Jan', open: 3000, overdue: 500 },
  { name: 'Feb', open: 4000, overdue: 200 },
]

describe('DashboardChartsSection', () => {
  it('renders the period cash flow title', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashIn={1000}
        cashOut={500}
        periodDays={30}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getByText('dashboard.charts.cashFlowPeriod')).toBeInTheDocument()
  })

  it('renders the receivables vs payables title', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashIn={1000}
        cashOut={500}
        periodDays={30}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getByText('dashboard.charts.receivablesVsPayables')).toBeInTheDocument()
  })

  it('charts the exact reported cash totals rather than a synthetic daily trend', () => {
    render(
      <DashboardChartsSection
        t={t}
        cashIn={1000}
        cashOut={500}
        periodDays={30}
        receivablesVsPayablesData={balanceData}
      />,
    )
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(2)
    expect(screen.getAllByTestId('bar-chart')[0]).toHaveTextContent('"data":[1000,500]')
  })
})
