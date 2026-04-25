export type CreateSalesInvoiceRequest = {
  invoiceNumber: string
  customerId: string
  sourceSalesOrderId?: string | null
  sourceSalesShipmentId?: string | null
  invoiceDate: string
  dueDate: string
  paymentTermId?: string | null
  status: number
  currencyCode: string
  notes?: string | null
}

export type UpdateSalesInvoiceRequest = CreateSalesInvoiceRequest & {
  isActive: boolean
}

export type CreateSalesInvoiceLineRequest = {
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
}

export type UpdateSalesInvoiceLineRequest = CreateSalesInvoiceLineRequest & {
  isActive: boolean
}