import { describe, expect, it } from 'vitest'
import type { FiscalPeriodListItemResponse } from '../../../types/api'
import { getFiscalCalendarDates, getFiscalPeriodDateStatus, getFiscalPeriodForDate, getFiscalPeriodsForDate, isFiscalPeriodDateOpen } from './fiscalPeriodCalendarUtils'

describe('fiscal period calendar date helpers', () => {
  it('returns a Monday-aligned calendar grid with ISO local dates', () => {
    const dates = getFiscalCalendarDates(2026, 9)
    expect(dates).toHaveLength(35)
    expect(dates.slice(0, 3)).toEqual([null, null, null])
    expect(dates[3]).toBe('2026-10-01')
    expect(dates[33]).toBe('2026-10-31')
    expect(dates[34]).toBeNull()
  })

  it('uses inclusive period boundaries and exposes overlapping periods', () => {
    const periods: FiscalPeriodListItemResponse[] = [
      { id: 'open', periodCode: 'FY26-10', startDate: '2026-10-01', endDate: '2026-10-31', isClosed: false },
      { id: 'closed', periodCode: 'FY26-Q4', startDate: '2026-10-31', endDate: '2026-12-31', isClosed: true },
    ]

    expect(getFiscalPeriodsForDate(periods, '2026-10-31').map((period) => period.id)).toEqual(['open', 'closed'])
    expect(getFiscalPeriodForDate(periods, '2026-10-01')?.periodCode).toBe('FY26-10')
    expect(getFiscalPeriodForDate(periods, '2027-01-01')).toBeNull()
    expect(getFiscalPeriodDateStatus(periods, '2026-10-31').status).toBe('overlap')
    expect(isFiscalPeriodDateOpen(periods, '2026-10-01')).toBe(true)
    expect(isFiscalPeriodDateOpen(periods, '2026-12-01')).toBe(false)
    expect(getFiscalPeriodDateStatus(periods, '2026-12-31').status).toBe('closed')
    expect(getFiscalPeriodDateStatus(periods, '2027-01-01').status).toBe('uncovered')
    expect(getFiscalPeriodDateStatus(periods, '').status).toBe('unset')
  })
})