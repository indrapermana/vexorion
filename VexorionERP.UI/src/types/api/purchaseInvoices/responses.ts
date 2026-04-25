export type PurchaseInvoiceListItemResponse = {
  id: string
  tenantId: string
  invoiceNumber: string
  supplierId: string
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

export type PurchaseInvoiceDetailsResponse = {
  id: string
  tenantId: string
  invoiceNumber: string
  supplierId: string
  sourcePurchaseOrderId?: string | null
  sourcePurchaseReceiptId?: string | null
  vendorReferenceNumber?: string | null
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

export type PurchaseInvoiceLineListItemResponse = {
  id: string
  tenantId: string
  purchaseInvoiceId: string
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitCost: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  isActive: boolean
}

export type PurchaseInvoiceLineDetailsResponse = {
  id: string
  tenantId: string
  purchaseInvoiceId: string
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitCost: number
  discountAmount: number
  taxAmount: number
  lineSubtotal: number
  lineTotal: number
  isActive: boolean
}