/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardCashFlowTable from './DashboardCashFlowTable'
import type { TFunction } from 'i18next'
import type { CashRowView } from '../types'

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (key === 'dashboard.cashSnapshot.window') return `Last ${opts?.days} days`
  return key
}) as unknown as TFunction

const cashRows: CashRowView[] = [
  { id: 'PAY-001', owner: 'Acme Corp', status: 'inflow', amount: '$1,200.00' },
  { id: 'PAY-002', owner: 'Beta LLC', status: 'outflow', amount: '$500.00' },
]

describe('DashboardCashFlowTable', () => {
  it('renders the section title', () => {
    render(<DashboardCashFlowTable t={t} periodDays={30} cashRows={cashRows} />)
    expect(screen.getByText('dashboard.cashSnapshot.title')).toBeInTheDocument()
  })

  it('renders the period window chip', () => {
    render(<DashboardCashFlowTable t={t} periodDays={30} cashRows={cashRows} />)
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders table column headers', () => {
    render(<DashboardCashFlowTable t={t} periodDays={30} cashRows={cashRows} />)
    expect(screen.getByText('dashboard.table.reference')).toBeInTheDocument()
    expect(screen.getByText('dashboard.table.source')).toBeInTheDocument()
    expect(screen.getByText('dashboard.table.direction')).toBeInTheDocument()
    expect(screen.getByText('dashboard.table.amount')).toBeInTheDocument()
  })

  it('renders each cash row', () => {
    render(<DashboardCashFlowTable t={t} periodDays={30} cashRows={cashRows} />)
    expect(screen.getByText('PAY-001')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
    expect(screen.getByText('PAY-002')).toBeInTheDocument()
    expect(screen.getByText('Beta LLC')).toBeInTheDocument()
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })

  it('renders empty table body when no rows provided', () => {
    render(<DashboardCashFlowTable t={t} periodDays={30} cashRows={[]} />)
    expect(screen.queryByText('PAY-001')).not.toBeInTheDocument()
    // headers still present
    expect(screen.getByText('dashboard.table.reference')).toBeInTheDocument()
  })
})
