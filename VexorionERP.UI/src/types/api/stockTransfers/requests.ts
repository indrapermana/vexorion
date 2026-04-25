export type CreateStockTransferRequest = {
  transferNumber: string
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  notes?: string | null
}

export type UpdateStockTransferRequest = CreateStockTransferRequest & {
  status: number
}

export type CreateStockTransferLineRequest = {
  productId: string
  quantity: number
  unitCost: number
}

export type UpdateStockTransferLineRequest = CreateStockTransferLineRequest & {
}