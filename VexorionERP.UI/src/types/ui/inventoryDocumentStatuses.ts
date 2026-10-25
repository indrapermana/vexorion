export const inventoryDocumentStatus = {
  draft: 1,
  completed: 4,
  cancelled: 5,
} as const

export function getAllowedInventoryDocumentStatuses(currentStatus: number) {
  if (currentStatus === inventoryDocumentStatus.draft) {
    return [currentStatus, inventoryDocumentStatus.completed, inventoryDocumentStatus.cancelled]
  }

  if (currentStatus === inventoryDocumentStatus.completed) {
    return [currentStatus, inventoryDocumentStatus.cancelled]
  }

  return [currentStatus]
}