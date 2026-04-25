export type SalesOrderLineListItemResponse = {
  id: string
  salesOrderId: string
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  isActive: boolean
}

export type PurchaseOrderLineListItemResponse = {
  id: string
  purchaseOrderId: string
  productId: string
  quantity: number
  unitCost: number
  lineTotal: number
  isActive: boolean
}