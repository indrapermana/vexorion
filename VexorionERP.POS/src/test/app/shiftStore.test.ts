import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useShift } from '../../app/shiftStore'
import type { ShiftSessionResponse } from '../../types/api'

const mockShift: ShiftSessionResponse = {
  id: 'shift-api-1',
  tenantId: 'tenant-1',
  cashierId: 'user-1',
  cashierName: 'Alice',
  openedAtUtc: '2024-01-01T08:00:00Z',
  closedAtUtc: null,
  openingFloat: 500,
  countedCash: null,
  cashSales: 0,
  cashRefunds: 0,
  cardSales: 0,
  transferSales: 0,
  cashIn: 0,
  cashOut: 0,
  currencyCode: 'USD',
  status: 'Open',
  notes: null,
}

const closedShift: ShiftSessionResponse = {
  ...mockShift,
  status: 'Closed',
  closedAtUtc: '2024-01-01T16:00:00Z',
}

vi.mock('../../lib/api/pos', () => ({
  openShiftApi: vi.fn(),
  closeShiftApi: vi.fn(),
  getCurrentShiftApi: vi.fn(),
}))

import * as posApi from '../../lib/api/pos'

// Helper: reset Zustand store to initial state between tests
function resetShiftStore() {
  act(() => {
    useShift.setState({ currentShift: null, loading: false })
  })
}

describe('shiftStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetShiftStore()
    vi.mocked(posApi.openShiftApi).mockResolvedValue(mockShift)
    vi.mocked(posApi.closeShiftApi).mockResolvedValue(closedShift)
    vi.mocked(posApi.getCurrentShiftApi).mockResolvedValue(mockShift)
  })

  it('starts with no active shift', () => {
    expect(useShift.getState().currentShift).toBeNull()
  })

  it('openShift calls API and sets shift', async () => {
    await act(async () => {
      await useShift.getState().openShift({
        openingFloat: 500,
        userId: 'user-1',
        userName: 'Alice',
        currencyCode: 'USD',
      })
    })

    expect(posApi.openShiftApi).toHaveBeenCalledWith({ openingFloat: 500, currencyCode: 'USD' })
    const shift = useShift.getState().currentShift
    expect(shift).not.toBeNull()
    expect(shift!.id).toBe('shift-api-1')
    expect(shift!.openedBy).toBe('user-1')
    expect(shift!.openedByName).toBe('Alice')
    expect(shift!.openingFloat).toBe(500)
    expect(shift!.currencyCode).toBe('USD')
  })

  it('closeShift calls API and clears shift', async () => {
    await act(async () => {
      await useShift.getState().openShift({ openingFloat: 0, userId: 'u', userName: 'A', currencyCode: 'USD' })
    })
    expect(useShift.getState().currentShift).not.toBeNull()

    await act(async () => {
      await useShift.getState().closeShift(120.5)
    })

    expect(posApi.closeShiftApi).toHaveBeenCalledWith('shift-api-1', { countedCash: 120.5, varianceReason: undefined })
    expect(useShift.getState().currentShift).toBeNull()
  })

  it('closeShift uses 0 as default countedCash', async () => {
    await act(async () => {
      await useShift.getState().openShift({ openingFloat: 0, userId: 'u', userName: 'A', currencyCode: 'USD' })
    })
    await act(async () => {
      await useShift.getState().closeShift()
    })

    expect(posApi.closeShiftApi).toHaveBeenCalledWith('shift-api-1', { countedCash: 0, varianceReason: undefined })
  })

  it('fetchCurrentShift sets shift from API', async () => {
    await act(async () => {
      await useShift.getState().fetchCurrentShift()
    })

    expect(posApi.getCurrentShiftApi).toHaveBeenCalled()
    expect(useShift.getState().currentShift?.id).toBe('shift-api-1')
  })

  it('fetchCurrentShift clears shift when API throws (404)', async () => {
    vi.mocked(posApi.getCurrentShiftApi).mockRejectedValueOnce(new Error('Not Found'))
    useShift.setState({ currentShift: { id: 'old', openedAt: '', openedBy: '', openedByName: '', openingFloat: 0, currencyCode: 'USD' } })

    await act(async () => {
      await useShift.getState().fetchCurrentShift()
    })

    expect(useShift.getState().currentShift).toBeNull()
  })

  it('closeShift is a no-op when no current shift', async () => {
    await act(async () => {
      await useShift.getState().closeShift()
    })
    expect(posApi.closeShiftApi).not.toHaveBeenCalled()
  })
})
