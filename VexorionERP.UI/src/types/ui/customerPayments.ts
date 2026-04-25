import type { CustomerListItemResponse, CustomerPaymentDetailsResponse, CustomerPaymentListItemResponse, SalesInvoiceListItemResponse } from '../api'

export type CustomerPaymentDialogMode = 'create'

export type CustomerPaymentGridRow = CustomerPaymentListItemResponse & {
  customerName?: string
  invoiceNumber?: string
}

export type CustomerPaymentFormValues = {
  customerId: string
  salesInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber: string
  paymentMethod: string
  notes: string
}

export type CustomerPaymentEditorDialogProps = {
  open: boolean
  customers: CustomerListItemResponse[]
  outstandingInvoices: SalesInvoiceListItemResponse[]
  initialValues?: Partial<CustomerPaymentFormValues>
  onClose: () => void
  onSaved: (payment: CustomerPaymentDetailsResponse, mode: CustomerPaymentDialogMode) => void
}
