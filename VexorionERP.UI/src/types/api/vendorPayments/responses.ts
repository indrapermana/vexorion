export type VendorPaymentListItemResponse = {
  id: string
  tenantId: string
  supplierId: string
  purchaseInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  isActive: boolean
}

export type VendorPaymentDetailsResponse = VendorPaymentListItemResponse & {
  notes?: string | null
}
