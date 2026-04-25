export type CreatePurchaseReceiptLineRequest = {
  purchaseOrderLineId: string
  productId: string
  receivedQuantity: number
  unitCost: number
}

export type CreatePurchaseReceiptRequest = {
  receiptNumber: string
  purchaseOrderId: string
  warehouseId: string
  receiptDate: string
  notes?: string | null
  lines: CreatePurchaseReceiptLineRequest[]
}
