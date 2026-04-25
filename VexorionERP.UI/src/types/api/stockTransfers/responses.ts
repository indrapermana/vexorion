export type StockTransferListItemResponse = {
  id: string
  transferNumber: string
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  status: number
  isActive: boolean
}

export type StockTransferLineDetailsResponse = {
  id: string
  stockTransferId: string
  productId: string
  quantity: number
  unitCost: number
  isActive: boolean
}

export type StockTransferDetailsResponse = {
  id: string
  tenantId: string
  transferNumber: string
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  status: number
  notes?: string | null
  isActive: boolean
  lines: StockTransferLineDetailsResponse[]
}