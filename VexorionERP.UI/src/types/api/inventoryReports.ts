export type InventoryValuationItemResponse = {
  productId: string
  sku: string
  productName: string
  unitOfMeasure: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  quantityOnHand: number
  currentStandardCost: number
  estimatedValue: number
  ledgerNetQuantity: number
  balanceToLedgerVariance: number
}

export type InventoryValuationReportResponse = {
  generatedAtUtc: string
  totalEstimatedValue: number
  reconciledItemCount: number
  unreconciledItemCount: number
  items: InventoryValuationItemResponse[]
}

export type InventoryMovementAuditItemResponse = {
  id: string
  createdAtUtc: string
  movementType: string
  productId: string
  sku: string
  productName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  quantity: number
  quantityOnHandDelta: number
  quantityReservedDelta: number
  referenceNumber: string
  sourceDocumentType: string | null
  sourceDocumentId: string | null
}

export type InventoryMovementAuditResponse = {
  skip: number
  take: number
  totalCount: number
  items: InventoryMovementAuditItemResponse[]
}

export type InventoryReorderRecommendationResponse = {
  productId: string
  sku: string
  productName: string
  unitOfMeasure: string
  activeWarehouseAvailable: number
  reorderLevel: number
  suggestedReorderQuantity: number
}

export type InventoryReorderReportResponse = {
  generatedAtUtc: string
  recommendationCount: number
  items: InventoryReorderRecommendationResponse[]
}