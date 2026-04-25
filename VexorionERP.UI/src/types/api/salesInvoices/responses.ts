export type SalesInvoiceListItemResponse = {
  id: string
  tenantId: string
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  dueDate: string
  status: number
  currencyCode: string
  subtotal: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  balanceDue: number
  isActive: boolean
}

export type SalesInvoiceDetailsResponse = {
  id: string
  tenantId: string
  invoiceNumber: string
  customerId: string
  sourceSalesOrderId?: string | null
  sourceSalesShipmentId?: string | null
  invoiceDate: string
  dueDate: string
  paymentTermId?: string | null
  status: number
  currencyCode: string
  subtotal: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  balanceDue: number
  notes?: string | null
  isActive: boolean
}

export type SalesInvoiceLineListItemResponse = {
  id: string
  tenantId: string
  salesInvoiceId: string
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  isActive: boolean
}

export type SalesInvoiceLineDetailsResponse = {
  id: string
  tenantId: string
  salesInvoiceId: string
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineSubtotal: number
  lineTotal: number
  isActive: boolean
}