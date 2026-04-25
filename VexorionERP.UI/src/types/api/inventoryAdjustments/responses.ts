export type InventoryAdjustmentListItemResponse = {
  id: string
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  status: number
  reason: string
  isActive: boolean
}

export type InventoryAdjustmentLineDetailsResponse = {
  id: string
  inventoryAdjustmentId: string
  productId: string
  quantityDelta: number
  unitCost: number
  reason?: string | null
  isActive: boolean
}

export type InventoryAdjustmentDetailsResponse = {
  id: string
  tenantId: string
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  status: number
  reason: string
  notes?: string | null
  isActive: boolean
  lines: InventoryAdjustmentLineDetailsResponse[]
}