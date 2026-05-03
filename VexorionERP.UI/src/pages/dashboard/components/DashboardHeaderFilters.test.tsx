/// <reference types="vitest/globals" />

import { render, screen, fireEvent } from '@testing-library/react'
import DashboardHeaderFilters from './DashboardHeaderFilters'
import type { TFunction } from 'i18next'

const t = ((key: string, opts?: Record<string, unknown>) => {
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

describe('DashboardHeaderFilters', () => {
  it('renders the dashboard title and description', () => {
    render(<DashboardHeaderFilters {...defaultProps} />)
    expect(screen.getByText('dashboard.hero.title')).toBeInTheDocument()
    expect(screen.getByText('dashboard.hero.description')).toBeInTheDocument()
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
