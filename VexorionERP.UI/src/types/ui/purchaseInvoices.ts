import type {
  ProductListItemResponse,
  PurchaseInvoiceDetailsResponse,
  PurchaseInvoiceLineListItemResponse,
  PurchaseInvoiceListItemResponse,
  SupplierListItemResponse,
} from '../api'
import { getInvoicePaymentBlockReason, invoiceStatusOptions, getInvoiceStatusLabel } from './salesInvoices'

export { getInvoicePaymentBlockReason, invoiceStatusOptions, getInvoiceStatusLabel }

export type PurchaseInvoiceDialogMode = 'create' | 'edit'

export type PurchaseInvoiceGridRow = PurchaseInvoiceListItemResponse & {
  supplierName?: string
}

export type PurchaseInvoiceFormValues = {
  invoiceNumber: string
  supplierId: string
  vendorReferenceNumber: string
  invoiceDate: string
  dueDate: string
  status: number
  currencyCode: string
  notes: string
  isActive: boolean
  sourcePurchaseOrderId?: string | null
}

export type PurchaseInvoiceEditorDialogProps = {
  open: boolean
  mode: PurchaseInvoiceDialogMode
  purchaseInvoiceId?: string | null
  suppliers: SupplierListItemResponse[]
  initialValues?: Partial<PurchaseInvoiceFormValues>
  onClose: () => void
  onSaved: (purchaseInvoice: PurchaseInvoiceDetailsResponse, mode: PurchaseInvoiceDialogMode) => void
}

export type PurchaseInvoiceLineFormValues = {
  productId: string
  quantity: number
  unitCost: number
  discountAmount: number
  taxAmount: number
  isActive: boolean
}

export type PurchaseInvoiceLineEditorDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  line: PurchaseInvoiceLineListItemResponse | null
  products: ProductListItemResponse[]
  onClose: () => void
  onSaved: (mode: 'create' | 'edit', values: PurchaseInvoiceLineFormValues) => Promise<void>
}