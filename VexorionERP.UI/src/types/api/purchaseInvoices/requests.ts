export type CreatePurchaseInvoiceRequest = {
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
  notes?: string | null
}

export type UpdatePurchaseInvoiceRequest = CreatePurchaseInvoiceRequest & {
  isActive: boolean
}

export type CreatePurchaseInvoiceLineRequest = {
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitCost: number
  discountAmount: number
  taxAmount: number
}

export type UpdatePurchaseInvoiceLineRequest = CreatePurchaseInvoiceLineRequest & {
  isActive: boolean
}