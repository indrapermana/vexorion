/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardAgingSection from './DashboardAgingSection'
import type { TFunction } from 'i18next'
import type { AgingPoint } from '../types'

vi.mock('@mui/x-charts', () => ({
  BarChart: ({ dataset }: { dataset: unknown[] }) => (
    <div data-testid="bar-chart" data-count={dataset.length} />
  ),
}))

vi.mock('../../../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (v: number) => `$${v.toFixed(2)}` }),
}))

const t = ((key: string) => key) as unknown as TFunction

const agingData: AgingPoint[] = [
  { name: '0-30', value: 5000 },
  { name: '31-60', value: 2000 },
]

const totals = { current: 0, due1To30: 0, due31To60: 0, due61To90: 0, total: 7000, dueOver90: 500 }

describe('DashboardAgingSection', () => {
  it('renders AR and AP aging card titles', () => {
    render(
      <DashboardAgingSection
        t={t}
        arAgingData={agingData}
        apAgingData={agingData}
        arTotals={totals}
        apTotals={totals}
      />,
    )
    expect(screen.getByText('dashboard.aging.arTitle')).toBeInTheDocument()
    expect(screen.getByText('dashboard.aging.apTitle')).toBeInTheDocument()
  })

  it('renders bar charts when data is present', () => {
    render(
      <DashboardAgingSection
        t={t}
        arAgingData={agingData}
        apAgingData={agingData}
        arTotals={null}
        apTotals={null}
      />,
    )
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(2)
  })

  it('renders empty text when aging data is empty', () => {
    render(
      <DashboardAgingSection
        t={t}
        arAgingData={[]}
        apAgingData={[]}
        arTotals={null}
        apTotals={null}
      />,
    )
    expect(screen.getByText('dashboard.aging.emptyAr')).toBeInTheDocument()
    expect(screen.getByText('dashboard.aging.emptyAp')).toBeInTheDocument()
  })

  it('renders totals when provided', () => {
    render(
      <DashboardAgingSection
        t={t}
        arAgingData={agingData}
        apAgingData={agingData}
        arTotals={totals}
        apTotals={totals}
      />,
    )
    // 2 cards × 2 rows = 4 formatted values
    expect(screen.getAllByText('$7000.00')).toHaveLength(2)
    expect(screen.getAllByText('$500.00')).toHaveLength(2)
  })

  it('does not render totals section when totals are null', () => {
    render(
      <DashboardAgingSection
        t={t}
        arAgingData={agingData}
        apAgingData={agingData}
        arTotals={null}
        apTotals={null}
      />,
    )
    expect(screen.queryByText('dashboard.aging.total')).not.toBeInTheDocument()
  })
})
