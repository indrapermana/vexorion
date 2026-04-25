import type { PurchaseOrderDetailsResponse, PurchaseOrderListItemResponse, SupplierListItemResponse, WarehouseListItemResponse } from '../api'

export type PurchaseOrderDialogMode = 'create' | 'edit'

export type PurchaseOrderGridRow = PurchaseOrderListItemResponse & {
  supplierName?: string
  warehouseName?: string
}

export type PurchaseOrderFormValues = {
  orderNumber: string
  supplierId: string
  warehouseId: string
  orderDate: string
  expectedReceiptDate: string
  status: number
  currencyCode: string
  notes: string
  isActive: boolean
}

export type PurchaseOrderEditorDialogProps = {
  open: boolean
  mode: PurchaseOrderDialogMode
  purchaseOrderId?: string | null
  suppliers: SupplierListItemResponse[]
  warehouses: WarehouseListItemResponse[]
  onClose: () => void
  onSaved: (purchaseOrder: PurchaseOrderDetailsResponse, mode: PurchaseOrderDialogMode) => void
}