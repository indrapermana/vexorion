import type { FiscalPeriodListItemResponse } from '../../../types/api'

export function getFiscalCalendarDates(year: number, month: number): Array<string | null> {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - mondayOffset + 1
    if (day < 1 || day > daysInMonth) return null
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })
}

export function getFiscalPeriodsForDate(periods: FiscalPeriodListItemResponse[], date: string) {
  return periods.filter((period) => period.startDate <= date && period.endDate >= date)
}

export function getFiscalPeriodForDate(periods: FiscalPeriodListItemResponse[], date: string) {
  return getFiscalPeriodsForDate(periods, date)[0] ?? null
}

export function getFiscalPeriodDateStatus(periods: FiscalPeriodListItemResponse[], date: string) {
  if (!date) return { status: 'unset' as const, period: null }

  const matchingPeriods = getFiscalPeriodsForDate(periods, date)
  if (matchingPeriods.length === 0) return { status: 'uncovered' as const, period: null }
  if (matchingPeriods.length > 1) return { status: 'overlap' as const, period: null }

  const period = matchingPeriods[0]
  return { status: period.isClosed ? 'closed' as const : 'open' as const, period }
}

export function isFiscalPeriodDateOpen(periods: FiscalPeriodListItemResponse[], date: string) {
  return getFiscalPeriodDateStatus(periods, date).status === 'open'
}