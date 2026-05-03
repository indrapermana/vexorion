import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useTransactionHistory, type PosTransaction } from '../../app/transactionHistoryStore'

function makeTransaction(overrides: Partial<PosTransaction> = {}): PosTransaction {
  return {
    id: `tx-${Math.random()}`,
    completedAt: new Date().toISOString(),
    customerLabel: 'Guest',
    currencyCode: 'USD',
    grandTotal: 100,
    paymentAmount: 100,
    paymentMethod: 'Cash',
    lineCount: 1,
    isDelivery: false,
    orderId: 'ORD-1',
    invoiceId: 'INV-1',
    ...overrides,
  }
}

function resetStore() {
  act(() => {
    useTransactionHistory.setState({ transactions: [] })
  })
}

describe('transactionHistoryStore', () => {
  beforeEach(resetStore)

  it('starts empty', () => {
    expect(useTransactionHistory.getState().transactions).toHaveLength(0)
  })

  it('push prepends the new transaction', () => {
    const tx1 = makeTransaction({ id: 'tx-first' })
    const tx2 = makeTransaction({ id: 'tx-second' })
    act(() => { useTransactionHistory.getState().push(tx1) })
    act(() => { useTransactionHistory.getState().push(tx2) })

    const { transactions } = useTransactionHistory.getState()
    expect(transactions[0].id).toBe('tx-second')
    expect(transactions[1].id).toBe('tx-first')
  })

  it('is capped at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      act(() => { useTransactionHistory.getState().push(makeTransaction({ id: `tx-${i}` })) })
    }
    expect(useTransactionHistory.getState().transactions).toHaveLength(10)
  })

  it('the most recent entries are kept when cap is exceeded', () => {
    for (let i = 0; i < 12; i++) {
      act(() => { useTransactionHistory.getState().push(makeTransaction({ id: `tx-${i}` })) })
    }
    const ids = useTransactionHistory.getState().transactions.map((t) => t.id)
    // Most recent is tx-11, oldest kept is tx-2
    expect(ids[0]).toBe('tx-11')
    expect(ids[ids.length - 1]).toBe('tx-2')
  })

  it('clear empties the list', () => {
    act(() => { useTransactionHistory.getState().push(makeTransaction()) })
    act(() => { useTransactionHistory.getState().clear() })
    expect(useTransactionHistory.getState().transactions).toHaveLength(0)
  })

  it('stores shiftId when provided', () => {
    const tx = makeTransaction({ shiftId: 'shift-abc' })
    act(() => { useTransactionHistory.getState().push(tx) })
    expect(useTransactionHistory.getState().transactions[0].shiftId).toBe('shift-abc')
  })

  it('shiftId is optional (undefined by default)', () => {
    act(() => { useTransactionHistory.getState().push(makeTransaction()) })
    expect(useTransactionHistory.getState().transactions[0].shiftId).toBeUndefined()
  })
})
