export type PurchaseReceiptLineResponse = {
  id: string
  purchaseOrderLineId: string
  productId: string
  productName: string
  receivedQuantity: number
  unitCost: number
  lineTotal: number
}

export type PurchaseReceiptListItemResponse = {
  id: string
  receiptNumber: string
  purchaseOrderId: string
  warehouseId: string
  warehouseName: string
  receiptDate: string
  status: number
  postedAtUtc?: string | null
  lineCount: number
}

export type PurchaseReceiptDetailsResponse = {
  id: string
  receiptNumber: string
  purchaseOrderId: string
  purchaseOrderNumber: string
  warehouseId: string
  warehouseName: string
  receiptDate: string
  status: number
  notes?: string | null
  postedAtUtc?: string | null
  lines: PurchaseReceiptLineResponse[]
}
