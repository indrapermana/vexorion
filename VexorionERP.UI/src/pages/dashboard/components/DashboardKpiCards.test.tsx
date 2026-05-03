/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardKpiCards from './DashboardKpiCards'
import type { TFunction } from 'i18next'
import type { FinanceDashboardSnapshotResponse } from '../../../types/api'

vi.mock('../../../app/CurrencyContext', () => ({
  useCurrency: () => ({ formatMoney: (v: number) => `$${v.toFixed(2)}` }),
}))

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (key === 'dashboard.summary.revenuePeriod') return `Revenue (${opts?.days}d)`
  if (key === 'dashboard.summary.overdueAmount') return `Overdue: ${opts?.amount}`
  return key
}) as unknown as TFunction

const snapshot: FinanceDashboardSnapshotResponse = {
  asOfDate: '2026-05-03',
  periodStartDate: '2026-04-03',
  periodDays: 30,
  receivablesOpen: 10000,
  receivablesOverdue: 2000,
  payablesOpen: 5000,
  payablesOverdue: 0,
  revenueInPeriod: 8000,
  cashInInPeriod: 7000,
  cashOutInPeriod: 3000,
  netCashInPeriod: 4000,
}

describe('DashboardKpiCards', () => {
  it('renders the open receivables label', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('dashboard.summary.openReceivables')).toBeInTheDocument()
  })

  it('renders the open payables label', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('dashboard.summary.openPayables')).toBeInTheDocument()
  })

  it('renders formatted receivables open value', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('$10000.00')).toBeInTheDocument()
  })

  it('renders formatted payables open value', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('$5000.00')).toBeInTheDocument()
  })

  it('renders overdue warning for receivables when overdue > 0', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('Overdue: $2000.00')).toBeInTheDocument()
  })

  it('does not render overdue warning for payables when overdue is 0', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    // Only 1 overdue element since payablesOverdue = 0
    expect(screen.getAllByText(/Overdue:/)).toHaveLength(1)
  })

  it('renders zero values gracefully when snapshot is null', () => {
    render(<DashboardKpiCards t={t} snapshot={null} periodDays={30} />)
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
  })

  it('renders revenue period label with days', () => {
    render(<DashboardKpiCards t={t} snapshot={snapshot} periodDays={30} />)
    expect(screen.getByText('Revenue (30d)')).toBeInTheDocument()
  })
})
