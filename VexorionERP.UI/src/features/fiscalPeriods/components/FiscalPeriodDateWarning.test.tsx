import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FiscalPeriodDateWarning from './FiscalPeriodDateWarning'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: { periodCode?: string; date?: string }) => values?.periodCode ?? values?.date ? `${key}: ${values.periodCode ?? values.date}` : key }),
}))

const periods = [
  { id: 'open', periodCode: 'FY26-10', startDate: '2026-10-01', endDate: '2026-10-31', isClosed: false },
  { id: 'closed', periodCode: 'FY26-09', startDate: '2026-09-01', endDate: '2026-09-30', isClosed: true },
]

describe('FiscalPeriodDateWarning', () => {
  it('identifies an open period and warns when the date is in a closed period', () => {
    const { rerender } = render(<FiscalPeriodDateWarning date="2026-10-12" periods={periods} />)
    expect(screen.getByRole('alert')).toHaveTextContent('pages.fiscalPeriods.dateStatus.open: FY26-10')

    rerender(<FiscalPeriodDateWarning date="2026-09-12" periods={periods} />)
    expect(screen.getByRole('alert')).toHaveTextContent('pages.fiscalPeriods.dateStatus.closed: FY26-09')
  })

  it('warns when a date has no fiscal-period coverage', () => {
    render(<FiscalPeriodDateWarning date="2027-01-01" periods={periods} />)
    expect(screen.getByRole('alert')).toHaveTextContent('pages.fiscalPeriods.dateStatus.uncovered: 2027-01-01')
  })
})