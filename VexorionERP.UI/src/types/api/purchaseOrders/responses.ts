export type PurchaseOrderListItemResponse = {
  id: string
  orderNumber: string
  supplierId: string
  warehouseId: string
  orderDate: string
  status: number
  currencyCode: string
  totalAmount: number
  isActive: boolean
}

export type PurchaseOrderDetailsResponse = {
  id: string
  tenantId: string
  orderNumber: string
  supplierId: string
  warehouseId: string
  orderDate: string
  expectedReceiptDate: string
  status: number
  currencyCode: string
  totalAmount: number
  notes?: string | null
  isActive: boolean
}