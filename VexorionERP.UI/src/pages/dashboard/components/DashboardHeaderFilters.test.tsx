/// <reference types="vitest/globals" />

import { render, screen, fireEvent } from '@testing-library/react'
import DashboardHeaderFilters from './DashboardHeaderFilters'
import { createInstance, type TFunction } from 'i18next'
import type { FinanceDashboardSnapshotResponse } from '../../../types/api'
import enUS from '../../../i18n/locales/enUS'
import idID from '../../../i18n/locales/idID'
import esES from '../../../i18n/locales/esES'

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (key === 'dashboard.context.period') return `${opts?.start} to ${opts?.end}: ${opts?.days} days inclusive`
  if (key === 'dashboard.context.currency') return `Display currency: ${opts?.currency}`
  if (opts?.days) return `Last ${opts.days} days`
  return key
}) as unknown as TFunction

const defaultProps = {
  t,
  asOfDate: '2026-05-03',
  periodDays: 30,
  periodOptions: [7, 30, 90],
  error: null,
  onAsOfDateChange: vi.fn(),
  onPeriodChange: vi.fn(),
}

const snapshot: FinanceDashboardSnapshotResponse = {
  asOfDate: '2026-05-03', periodStartDate: '2026-04-04', periodDays: 30,
  receivablesOpen: 0, receivablesOverdue: 0, payablesOpen: 0, payablesOverdue: 0,
  revenueInPeriod: 0, cashInInPeriod: 0, cashOutInPeriod: 0, netCashInPeriod: 0,
}

describe('DashboardHeaderFilters', () => {
  it.each([
    ['2026-05-03', '2026-04-04', 30, /Apr 4, 2026 to May 3, 2026: 30 days inclusive/],
    ['2024-03-01', '2024-02-01', 30, /Feb 1, 2024 to Mar 1, 2024: 30 days inclusive/],
    ['2026-01-01', '2026-01-01', 1, /Jan 1, 2026 to Jan 1, 2026: 1 days inclusive/],
  ])('shows the returned inclusive period ending %s', (asOfDate, periodStartDate, periodDays, expected) => {
    render(<DashboardHeaderFilters {...defaultProps} snapshot={{ ...snapshot, asOfDate, periodStartDate, periodDays }} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.getByText('Display currency: USD')).toBeInTheDocument()
  })

  it.each([['en-US', enUS], ['id-ID', idID], ['es-ES', esES]] as const)('ships complete KPI definitions in %s', async (language, resource) => {
    const translations = createInstance()
    await translations.init({ lng: language, resources: { [language]: { translation: resource } }, interpolation: { escapeValue: false } })
    const keys = [
      'context.period', 'context.balances', 'context.currency',
      'definitions.receivables', 'definitions.payables', 'definitions.invoicedSales', 'definitions.netCash',
      'quickStats.notApplicable', 'quickStats.currentShareDefinition', 'quickStats.overdueShareDefinition', 'quickStats.netBalanceDefinition',
      'aging.current', 'aging.days1To30', 'aging.days31To60', 'aging.days61To90', 'aging.daysOver90',
      'summary.balancedFlow', 'cashRows.balanced',
    ]
    for (const key of keys) expect(translations.exists(`dashboard.${key}`)).toBe(true)
    render(<DashboardHeaderFilters {...defaultProps} t={translations.t} snapshot={snapshot} />)
    expect(screen.getByText(translations.t('dashboard.context.currency', { currency: 'USD' }))).toBeInTheDocument()
    expect(screen.getByText(resource.dashboard.context.balances)).toBeInTheDocument()
    expect(screen.queryByText(/\{\{|dashboard\./)).not.toBeInTheDocument()
  })

  it('labels the financial overview without presenting filters as page-wide controls', () => {
    render(<DashboardHeaderFilters {...defaultProps} />)
    expect(screen.getByRole('heading', { level: 2, name: 'dashboard.sections.overview' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.hero.description')).not.toBeInTheDocument()
  })

  it('renders the date filter with the provided value', () => {
    render(<DashboardHeaderFilters {...defaultProps} />)
    const dateInput = screen.getByLabelText('dashboard.filters.asOfDate') as HTMLInputElement
    expect(dateInput.value).toBe('2026-05-03')
  })

  it('calls onAsOfDateChange when date changes', () => {
    const onAsOfDateChange = vi.fn()
    render(<DashboardHeaderFilters {...defaultProps} onAsOfDateChange={onAsOfDateChange} />)
    const dateInput = screen.getByLabelText('dashboard.filters.asOfDate')
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } })
    expect(onAsOfDateChange).toHaveBeenCalledWith('2026-06-01')
  })

  it('calls onPeriodChange when period select changes', () => {
    const onPeriodChange = vi.fn()
    render(<DashboardHeaderFilters {...defaultProps} onPeriodChange={onPeriodChange} />)
    const select = screen.getByLabelText('dashboard.filters.window')
    fireEvent.change(select, { target: { value: '90' } })
    expect(onPeriodChange).toHaveBeenCalledWith(90)
  })

  it('renders period options', () => {
    render(<DashboardHeaderFilters {...defaultProps} />)
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('Last 90 days')).toBeInTheDocument()
  })

  it('renders an error alert when error is provided', () => {
    render(<DashboardHeaderFilters {...defaultProps} error="Failed to load data" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('does not render an alert when error is null', () => {
    render(<DashboardHeaderFilters {...defaultProps} error={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
