import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Shift = {
  id: string
  openedAt: string
  openedBy: string
  openedByName: string
  openingFloat: number
  currencyCode: string
}

type ShiftState = {
  currentShift: Shift | null
  openShift: (params: {
    openingFloat: number
    userId: string
    userName: string
    currencyCode: string
  }) => void
  closeShift: () => void
}

export const useShift = create<ShiftState>()(
  persist(
    (set) => ({
      currentShift: null,
      openShift: ({ openingFloat, userId, userName, currencyCode }) =>
        set({
          currentShift: {
            id: `shift-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            openedAt: new Date().toISOString(),
            openedBy: userId,
            openedByName: userName,
            openingFloat,
            currencyCode,
          },
        }),
      closeShift: () => set({ currentShift: null }),
    }),
    { name: 'vexorionerp.pos.shift' },
  ),
)
