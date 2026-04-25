export type CreateVendorPaymentRequest = {
  supplierId: string
  purchaseInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  notes?: string | null
}
