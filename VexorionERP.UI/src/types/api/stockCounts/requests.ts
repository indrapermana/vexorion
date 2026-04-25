export type CreateStockCountRequest = {
  countNumber: string
  warehouseId: string
  countDate: string
  notes?: string | null
}

export type UpdateStockCountRequest = CreateStockCountRequest & {
  status: number
}

export type CreateStockCountLineRequest = {
  productId: string
  systemQuantity: number
  countedQuantity: number
}

export type UpdateStockCountLineRequest = CreateStockCountLineRequest & {
}
