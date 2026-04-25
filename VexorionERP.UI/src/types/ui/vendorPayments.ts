import type { PurchaseInvoiceListItemResponse, SupplierListItemResponse, VendorPaymentDetailsResponse, VendorPaymentListItemResponse } from '../api'

export type VendorPaymentDialogMode = 'create'

export type VendorPaymentGridRow = VendorPaymentListItemResponse & {
  supplierName?: string
  invoiceNumber?: string
}

export type VendorPaymentFormValues = {
  supplierId: string
  purchaseInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber: string
  paymentMethod: string
  notes: string
}

export type VendorPaymentEditorDialogProps = {
  open: boolean
  suppliers: SupplierListItemResponse[]
  outstandingInvoices: PurchaseInvoiceListItemResponse[]
  initialValues?: Partial<VendorPaymentFormValues>
  onClose: () => void
  onSaved: (payment: VendorPaymentDetailsResponse, mode: VendorPaymentDialogMode) => void
}
