/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardHealthSection from './DashboardHealthSection'
import type { TFunction } from 'i18next'

vi.mock('../../../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (v: number) => `$${v.toFixed(2)}` }),
}))

const t = ((key: string) => key) as unknown as TFunction

const defaultProps = {
  t,
  receivablesHealthPercent: 75,
  payablesHealthPercent: 40,
  totalReceivables: 10000,
  totalPayables: 5000,
}

describe('DashboardHealthSection', () => {
  it('does not represent empty balances as 100% healthy', () => {
    render(<DashboardHealthSection {...defaultProps} totalReceivables={0} totalPayables={0} receivablesHealthPercent={0} payablesHealthPercent={0} />)
    expect(screen.getAllByText('dashboard.quickStats.notApplicable')).toHaveLength(2)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  it('renders receivables and payables section headings', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    expect(screen.getByText('dashboard.health.receivables')).toBeInTheDocument()
    expect(screen.getByText('dashboard.health.payables')).toBeInTheDocument()
  })

  it('renders the receivables health percentage', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renders the payables health percentage', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('renders total receivables formatted value', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    expect(screen.getByText('$10000.00')).toBeInTheDocument()
  })

  it('renders total payables formatted value', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    expect(screen.getByText('$5000.00')).toBeInTheDocument()
  })

  it('renders progress bars for both sections', () => {
    render(<DashboardHealthSection {...defaultProps} />)
    const progressBars = document.querySelectorAll('[role="progressbar"]')
    expect(progressBars).toHaveLength(2)
  })
})
