export type CreateSalesOrderLineRequest = {
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
}

export type UpdateSalesOrderLineRequest = CreateSalesOrderLineRequest & {
  isActive: boolean
}

export type CreatePurchaseOrderLineRequest = {
  productId: string
  quantity: number
  unitCost: number
}

export type UpdatePurchaseOrderLineRequest = CreatePurchaseOrderLineRequest & {
  isActive: boolean
}