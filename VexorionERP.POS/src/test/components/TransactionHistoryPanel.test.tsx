import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactionHistory } from '../../app/transactionHistoryStore'
import { TransactionHistoryPanel } from '../../components/TransactionHistoryPanel'
import { renderWithProviders, screen, userEvent } from '../testUtils'

describe('TransactionHistoryPanel', () => {
  beforeEach(() => {
    act(() => useTransactionHistory.setState({ transactions: [] }))
  })

  it('labels the scrollable history table and explains local-history clearing', async () => {
    act(() => {
      useTransactionHistory.getState().push({
        id: 'transaction-1',
        completedAt: '2026-10-30T05:00:00.000Z',
        customerLabel: 'Walk-in Customer',
        currencyCode: 'USD',
        grandTotal: 12,
        paymentAmount: 20,
        paymentMethod: 'Cash',
        lineCount: 1,
        isDelivery: false,
        orderId: 'order-1',
        invoiceId: 'invoice-1',
      })
    })

    renderWithProviders(<TransactionHistoryPanel open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('table', { name: 'Recent Transactions (1)' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByText(/stored on this device/i)).toBeInTheDocument()
    expect(screen.getByText(/server records are not deleted/i)).toBeInTheDocument()
  })
})
