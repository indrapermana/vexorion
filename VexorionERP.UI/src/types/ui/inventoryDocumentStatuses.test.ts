import { describe, expect, it } from 'vitest'
import { getAllowedInventoryDocumentStatuses, inventoryDocumentStatus } from './inventoryDocumentStatuses'

describe('inventory document status transitions', () => {
  it('allows draft documents to remain draft, complete, or cancel', () => {
    expect(getAllowedInventoryDocumentStatuses(inventoryDocumentStatus.draft)).toEqual([1, 4, 5])
  })

  it('allows completed documents to remain completed or reverse to cancelled', () => {
    expect(getAllowedInventoryDocumentStatuses(inventoryDocumentStatus.completed)).toEqual([4, 5])
  })

  it('does not allow transitions from cancelled or unknown states', () => {
    expect(getAllowedInventoryDocumentStatuses(inventoryDocumentStatus.cancelled)).toEqual([5])
    expect(getAllowedInventoryDocumentStatuses(2)).toEqual([2])
  })
})