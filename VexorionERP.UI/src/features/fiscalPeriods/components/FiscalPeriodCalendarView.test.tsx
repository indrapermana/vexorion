import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FiscalPeriodCalendar from './FiscalPeriodCalendar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'enUS' } }),
}))

const periods = [
  { id: 'open-period', periodCode: 'FY26-10', startDate: '2026-10-01', endDate: '2026-10-31', isClosed: false },
  { id: 'closed-period', periodCode: 'FY26-09', startDate: '2026-09-01', endDate: '2026-09-30', isClosed: true },
]

describe('FiscalPeriodCalendar', () => {
  it('shows covered dates with period status and supports month navigation', () => {
    render(<FiscalPeriodCalendar periods={periods} initialMonth={new Date(2026, 9, 1)} />)

    expect(screen.getByText('October 2026')).toBeInTheDocument()
    expect(screen.getAllByText('FY26-10 · common.labels.open').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'pages.fiscalPeriods.calendar.nextMonth' }))
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })
})