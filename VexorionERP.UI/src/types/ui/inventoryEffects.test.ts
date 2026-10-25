import { describe, expect, it } from 'vitest'
import { getInventoryAdjustmentEffect, getStockCountEffect, getStockTransferEffect } from './inventoryEffects'

describe('inventory posting effect calculations', () => {
  it('previews adjustment posting and reversal deltas', () => {
    expect(getInventoryAdjustmentEffect(1, 4, -3)).toBe(-3)
    expect(getInventoryAdjustmentEffect(4, 5, -3)).toBe(3)
    expect(getInventoryAdjustmentEffect(1, 2, -3)).toBe(0)
  })

  it('previews both warehouse sides of transfer posting and reversal', () => {
    expect(getStockTransferEffect(1, 4, 3)).toEqual({ sourceDelta: -3, destinationDelta: 3 })
    expect(getStockTransferEffect(4, 5, 3)).toEqual({ sourceDelta: 3, destinationDelta: -3 })
    expect(getStockTransferEffect(1, 2, 3)).toEqual({ sourceDelta: 0, destinationDelta: 0 })
  })

  it('previews count variance posting and reversal', () => {
    expect(getStockCountEffect(1, 4, 10, 8)).toBe(-2)
    expect(getStockCountEffect(4, 5, 10, 8)).toBe(2)
    expect(getStockCountEffect(1, 2, 10, 8)).toBe(0)
  })
})