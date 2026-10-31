import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderWithProviders, screen, waitFor } from '../testUtils'
import { ShiftCloseDialog } from '../../components/pos/ShiftCloseDialog'
import { useTransactionHistory } from '../../app/transactionHistoryStore'
import type { Shift } from '../../app/shiftStore'
import type { PosTransaction } from '../../app/transactionHistoryStore'
import * as posApi from '../../lib/api/pos'

vi.mock('../../lib/api/pos', () => ({
  getShiftReconciliationApi: vi.fn(),
  addShiftCashMovementApi: vi.fn(),
}))

const SHIFT: Shift = {
  id: 'shift-test-1',
  openedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  openedBy: 'user-1',
  openedByName: 'Alice',
  openingFloat: 500,
  currencyCode: 'USD',
}

const RECONCILIATION = {
  shiftId: SHIFT.id,
  openingFloat: 500,
  cashSales: 200,
  cashRefunds: 20,
  cardSales: 75,
  transferSales: 25,
  cashIn: 10,
  cashOut: 5,
  expectedCash: 685,
  currencyCode: 'USD',
  movements: [],
}

function makeTx(overrides: Partial<PosTransaction> = {}): PosTransaction {
  return {
    id: `tx-${Math.random()}`,
    shiftId: SHIFT.id,
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

function resetHistory() {
  act(() => {
    useTransactionHistory.setState({ transactions: [] })
  })
}

describe('ShiftCloseDialog', () => {
  beforeEach(() => {
    resetHistory()
    vi.mocked(posApi.getShiftReconciliationApi).mockResolvedValue(RECONCILIATION)
  })

  it('renders when open=true', () => {
    renderWithProviders(
      <ShiftCloseDialog
        open
        shift={SHIFT}
        currencyCode="USD"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('uses section headings beneath the dialog title', () => {
    renderWithProviders(
      <ShiftCloseDialog
        open
        shift={SHIFT}
        currencyCode="USD"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Close Shift', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Shift Summary', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cash Reconciliation', level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/closing ends this cashier shift/i)).toBeInTheDocument()
    expect(screen.getByText(/calculated from completed server records/i)).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    renderWithProviders(
      <ShiftCloseDialog
        open={false}
        shift={SHIFT}
        currencyCode="USD"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders authoritative totals from the server instead of device history', async () => {
    act(() => {
      // Two transactions for this shift
      useTransactionHistory.getState().push(makeTx({ grandTotal: 120 }))
      useTransactionHistory.getState().push(makeTx({ grandTotal: 80 }))
      // One transaction for a different shift — must NOT be counted
      useTransactionHistory.getState().push(makeTx({ shiftId: 'other-shift', grandTotal: 9999 }))
    })

    renderWithProviders(
      <ShiftCloseDialog
        open
        shift={SHIFT}
        currencyCode="USD"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    await waitFor(() => expect(posApi.getShiftReconciliationApi).toHaveBeenCalledWith(SHIFT.id))
    expect(screen.getAllByText(/\$200\.00|200\.00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\$10,?199/)).not.toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ShiftCloseDialog open shift={SHIFT} currencyCode="USD" onClose={onClose} onConfirm={vi.fn()} />,
    )
    const cancelBtn = screen.getByRole('button', { name: /cancel|batal|cancelar/i })
    cancelBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
