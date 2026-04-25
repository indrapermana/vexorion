import type { CustomerListItemResponse, SalesOrderDetailsResponse, SalesOrderListItemResponse, WarehouseListItemResponse } from '../api'

export type SalesOrderDialogMode = 'create' | 'edit'

export type SalesOrderGridRow = SalesOrderListItemResponse & {
  customerName?: string
  warehouseName?: string
}

export type SalesOrderFormValues = {
  orderNumber: string
  customerId: string
  warehouseId: string
  orderDate: string
  requiredDate: string
  status: number
  currencyCode: string
  notes: string
  isActive: boolean
}

export type SalesOrderEditorDialogProps = {
  open: boolean
  mode: SalesOrderDialogMode
  salesOrderId?: string | null
  customers: CustomerListItemResponse[]
  warehouses: WarehouseListItemResponse[]
  onClose: () => void
  onSaved: (salesOrder: SalesOrderDetailsResponse, mode: SalesOrderDialogMode) => void
}

export const documentStatusOptions = [
  { value: 1, label: 'Draft' },
  { value: 2, label: 'Confirmed' },
  { value: 3, label: 'Partially processed' },
  { value: 4, label: 'Completed' },
  { value: 5, label: 'Cancelled' },
] as const

export function getDocumentStatusLabel(status: number) {
  return documentStatusOptions.find((option) => option.value === status)?.label ?? `Status ${status}`
}