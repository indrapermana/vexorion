import { describe, expect, it } from 'vitest'
import { getInvoicePaymentBlockReason } from './salesInvoices'

describe('invoice payment availability', () => {
  it.each([
    [1, 100, 'draft'],
    [6, 100, 'cancelled'],
    [2, 0, 'noBalance'],
    [3, -1, 'noBalance'],
    [2, 50, null],
    [3, 50, null],
    [5, 50, null],
  ] as const)('maps status %s and balance %s to the current payment availability', (status, balance, expected) => {
    expect(getInvoicePaymentBlockReason(status, balance)).toBe(expected)
  })
})