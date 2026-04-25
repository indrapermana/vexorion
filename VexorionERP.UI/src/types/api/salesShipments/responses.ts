export type SalesShipmentLineResponse = {
  id: string
  salesOrderLineId: string
  productId: string
  productName: string
  shippedQuantity: number
  unitPrice: number
  lineTotal: number
}

export type SalesShipmentListItemResponse = {
  id: string
  shipmentNumber: string
  salesOrderId: string
  warehouseId: string
  warehouseName: string
  shipmentDate: string
  status: number
  postedAtUtc?: string | null
  lineCount: number
}

export type SalesShipmentDetailsResponse = {
  id: string
  shipmentNumber: string
  salesOrderId: string
  salesOrderNumber: string
  warehouseId: string
  warehouseName: string
  shipmentDate: string
  status: number
  notes?: string | null
  postedAtUtc?: string | null
  lines: SalesShipmentLineResponse[]
}
