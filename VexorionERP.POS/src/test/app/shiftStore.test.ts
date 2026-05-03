import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useShift } from '../../app/shiftStore'

// Helper: reset Zustand store to initial state between tests
function resetShiftStore() {
  act(() => {
    useShift.setState({ currentShift: null })
  })
}

describe('shiftStore', () => {
  beforeEach(resetShiftStore)

  it('starts with no active shift', () => {
    expect(useShift.getState().currentShift).toBeNull()
  })

  it('openShift sets all fields correctly', () => {
    act(() => {
      useShift.getState().openShift({
        openingFloat: 500,
        userId: 'user-1',
        userName: 'Alice',
        currencyCode: 'USD',
      })
    })

    const shift = useShift.getState().currentShift
    expect(shift).not.toBeNull()
    expect(shift!.openedBy).toBe('user-1')
    expect(shift!.openedByName).toBe('Alice')
    expect(shift!.openingFloat).toBe(500)
    expect(shift!.currencyCode).toBe('USD')
    expect(shift!.id).toMatch(/^shift-\d+-[a-z0-9]+$/)
    expect(new Date(shift!.openedAt).getTime()).toBeGreaterThan(0)
  })

  it('openShift generates a unique id on each call', () => {
    act(() => {
      useShift.getState().openShift({ openingFloat: 0, userId: 'u1', userName: 'A', currencyCode: 'USD' })
    })
    const id1 = useShift.getState().currentShift!.id

    act(() => {
      useShift.getState().openShift({ openingFloat: 0, userId: 'u2', userName: 'B', currencyCode: 'USD' })
    })
    const id2 = useShift.getState().currentShift!.id

    expect(id1).not.toBe(id2)
  })

  it('closeShift nulls currentShift', () => {
    act(() => {
      useShift.getState().openShift({ openingFloat: 200, userId: 'u', userName: 'B', currencyCode: 'EUR' })
    })
    expect(useShift.getState().currentShift).not.toBeNull()

    act(() => {
      useShift.getState().closeShift()
    })
    expect(useShift.getState().currentShift).toBeNull()
  })

  it('openingFloat of 0 is valid', () => {
    act(() => {
      useShift.getState().openShift({ openingFloat: 0, userId: 'u', userName: 'C', currencyCode: 'IDR' })
    })
    expect(useShift.getState().currentShift!.openingFloat).toBe(0)
  })
})
