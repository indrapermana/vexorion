export type StockCountListItemResponse = {
  id: string
  countNumber: string
  warehouseId: string
  countDate: string
  status: number
  isActive: boolean
}

export type StockCountLineDetailsResponse = {
  id: string
  stockCountId: string
  productId: string
  systemQuantity: number
  countedQuantity: number
  varianceQuantity: number
  isActive: boolean
}

export type StockCountDetailsResponse = {
  id: string
  tenantId: string
  countNumber: string
  warehouseId: string
  countDate: string
  status: number
  notes?: string | null
  isActive: boolean
  lines: StockCountLineDetailsResponse[]
}
