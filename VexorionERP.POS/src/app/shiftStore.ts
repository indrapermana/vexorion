import { create } from 'zustand'
import { openShiftApi, closeShiftApi, getCurrentShiftApi } from '../lib/api/pos'

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
  loading: boolean
  openShift: (params: {
    openingFloat: number
    userId: string
    userName: string
    currencyCode: string
  }) => Promise<void>
  closeShift: (countedCash?: number, varianceReason?: string) => Promise<void>
  fetchCurrentShift: () => Promise<void>
}

function mapResponse(r: import('../types/api').ShiftSessionResponse): Shift {
  return {
    id: r.id,
    openedAt: r.openedAtUtc,
    openedBy: r.cashierId,
    openedByName: r.cashierName,
    openingFloat: r.openingFloat,
    currencyCode: r.currencyCode,
  }
}

export const useShift = create<ShiftState>()((set, get) => ({
  currentShift: null,
  loading: false,

  openShift: async ({ openingFloat, currencyCode }) => {
    set({ loading: true })
    try {
      const response = await openShiftApi({ openingFloat, currencyCode })
      set({ currentShift: mapResponse(response) })
    } finally {
      set({ loading: false })
    }
  },

  closeShift: async (countedCash = 0, varianceReason) => {
    const shift = get().currentShift
    if (!shift) return
    set({ loading: true })
    try {
      await closeShiftApi(shift.id, { countedCash, varianceReason })
      set({ currentShift: null })
    } finally {
      set({ loading: false })
    }
  },

  fetchCurrentShift: async () => {
    set({ loading: true })
    try {
      const response = await getCurrentShiftApi()
      set({ currentShift: mapResponse(response) })
    } catch {
      // 404 means no active shift — this is normal
      set({ currentShift: null })
    } finally {
      set({ loading: false })
    }
  },
}))
