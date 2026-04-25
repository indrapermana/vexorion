export type CreateCustomerPaymentRequest = {
  customerId: string
  salesInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  notes?: string | null
}
