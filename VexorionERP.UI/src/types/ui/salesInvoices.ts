import type {
  CustomerListItemResponse,
  ProductListItemResponse,
  SalesInvoiceDetailsResponse,
  SalesInvoiceLineListItemResponse,
  SalesInvoiceListItemResponse,
} from '../api'

export type SalesInvoiceDialogMode = 'create' | 'edit'

export type SalesInvoiceGridRow = SalesInvoiceListItemResponse & {
  customerName?: string
}

export type SalesInvoiceFormValues = {
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  dueDate: string
  status: number
  currencyCode: string
  notes: string
  isActive: boolean
  sourceSalesOrderId?: string | null
}

export type SalesInvoiceEditorDialogProps = {
  open: boolean
  mode: SalesInvoiceDialogMode
  salesInvoiceId?: string | null
  customers: CustomerListItemResponse[]
  initialValues?: Partial<SalesInvoiceFormValues>
  onClose: () => void
  onSaved: (salesInvoice: SalesInvoiceDetailsResponse, mode: SalesInvoiceDialogMode) => void
}

export type SalesInvoiceLineFormValues = {
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  isActive: boolean
}

export type SalesInvoiceLineEditorDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  line: SalesInvoiceLineListItemResponse | null
  products: ProductListItemResponse[]
  onClose: () => void
  onSaved: (mode: 'create' | 'edit', values: SalesInvoiceLineFormValues) => Promise<void>
}

export const invoiceStatusOptions = [
  { value: 1, label: 'Draft' },
  { value: 2, label: 'Issued' },
  { value: 3, label: 'Partially paid' },
  { value: 4, label: 'Paid' },
  { value: 5, label: 'Overdue' },
  { value: 6, label: 'Cancelled' },
] as const

export function getInvoiceStatusLabel(status: number) {
  return invoiceStatusOptions.find((option) => option.value === status)?.label ?? `Status ${status}`
}