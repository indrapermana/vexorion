import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PosTransaction = {
  id: string
  completedAt: string
  customerLabel: string
  grandTotal: number
  paymentAmount: number
  paymentMethod: string
  lineCount: number
  isDelivery: boolean
  orderId: string
  invoiceId: string
  shipmentId?: string
  paymentId?: string
}

type HistoryState = {
  transactions: PosTransaction[]
  push: (transaction: PosTransaction) => void
  clear: () => void
}

export const useTransactionHistory = create<HistoryState>()(
  persist(
    (set) => ({
      transactions: [],
      push: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions].slice(0, 10),
        })),
      clear: () => set({ transactions: [] }),
    }),
    {
      name: 'vexorionerp.pos.history',
    },
  ),
)
