export type CustomerPaymentListItemResponse = {
  id: string
  tenantId: string
  customerId: string
  salesInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  isActive: boolean
}

export type CustomerPaymentDetailsResponse = CustomerPaymentListItemResponse & {
  notes?: string | null
}
