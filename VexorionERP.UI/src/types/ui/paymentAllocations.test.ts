import { describe, expect, it } from 'vitest'
import { getPaymentAllocationError, getPaymentAllocationPreview } from './paymentAllocations'

describe('payment allocation preview', () => {
  it('previews a partial payment without unapplied funds', () => {
    expect(getPaymentAllocationPreview(100, 35)).toEqual({
      invoiceBalance: 100,
      paymentAmount: 35,
      allocatedAmount: 35,
      unappliedAmount: 0,
      remainingBalance: 65,
    })
  })

  it('shows unapplied funds for an amount above the invoice balance', () => {
    expect(getPaymentAllocationPreview(100, 125)).toEqual({
      invoiceBalance: 100,
      paymentAmount: 125,
      allocatedAmount: 100,
      unappliedAmount: 25,
      remainingBalance: 0,
    })
  })

  it('blocks excess amounts and currency mismatches before submission', () => {
    expect(getPaymentAllocationError(100, 101, 'USD', 'USD')).toBe('exceedsBalance')
    expect(getPaymentAllocationError(100, 100, 'USD', 'EUR')).toBe('currencyMismatch')
    expect(getPaymentAllocationError(100, 100, 'usd', 'USD')).toBeNull()
  })
})