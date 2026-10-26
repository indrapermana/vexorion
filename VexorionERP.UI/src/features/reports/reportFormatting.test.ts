import { describe, expect, it } from 'vitest'
import { formatReportCurrency, formatReportDate, getAgingTotalsByCurrency } from './reportFormatting'

describe('report formatting', () => {
  it('keeps aging totals separated by currency', () => {
    const totals = getAgingTotalsByCurrency([
      { currencyCode: 'USD', buckets: { total: 1200.5 } },
      { currencyCode: 'IDR', buckets: { total: 250000 } },
      { currencyCode: 'USD', buckets: { total: 9.5 } },
    ])

    expect(totals).toEqual([['IDR', 250000], ['USD', 1210]])
    expect(formatReportCurrency(totals[0][1], totals[0][0], 'id-ID')).toContain('250.000')
    expect(formatReportCurrency(totals[1][1], totals[1][0], 'en-US')).toBe('$1,210.00')
  })

  it('formats ISO date-only values in the selected locale without UTC day shifts', () => {
    expect(formatReportDate('2026-10-26', 'en-US')).toBe('Oct 26, 2026')
    expect(formatReportDate('2026-10-26', 'es-ES')).toBe('26 oct 2026')
  })
})