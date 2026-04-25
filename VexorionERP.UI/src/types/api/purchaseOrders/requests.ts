export type CreatePurchaseOrderRequest = {
  orderNumber: string
  supplierId: string
  warehouseId: string
  orderDate: string
  expectedReceiptDate: string
  status: number
  currencyCode: string
  notes?: string | null
}

export type UpdatePurchaseOrderRequest = CreatePurchaseOrderRequest & {
  isActive: boolean
}