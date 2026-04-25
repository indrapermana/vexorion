export type CreateSalesShipmentLineRequest = {
  salesOrderLineId: string
  productId: string
  shippedQuantity: number
  unitPrice: number
}

export type CreateSalesShipmentRequest = {
  shipmentNumber: string
  salesOrderId: string
  warehouseId: string
  shipmentDate: string
  notes?: string | null
  lines: CreateSalesShipmentLineRequest[]
}
