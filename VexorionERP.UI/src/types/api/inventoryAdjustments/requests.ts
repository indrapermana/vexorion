export type CreateInventoryAdjustmentRequest = {
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  reason: string
  notes?: string | null
}

export type UpdateInventoryAdjustmentRequest = CreateInventoryAdjustmentRequest & {
  status: number
}

export type CreateInventoryAdjustmentLineRequest = {
  productId: string
  quantityDelta: number
  unitCost: number
  reason?: string | null
}

export type UpdateInventoryAdjustmentLineRequest = CreateInventoryAdjustmentLineRequest & {
}