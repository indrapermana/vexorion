import type { PurchaseReceiptDetailsResponse, PurchaseReceiptListItemResponse, WarehouseListItemResponse } from '../api'

export type PurchaseReceiptGridRow = PurchaseReceiptListItemResponse

export type PurchaseReceiptFormValues = {
  receiptNumber: string
  warehouseId: string
  receiptDate: string
  notes: string
}

export type PurchaseReceiptEditorDialogProps = {
  open: boolean
  purchaseOrderId: string
  warehouses: WarehouseListItemResponse[]
  onClose: () => void
  onSaved: (receipt: PurchaseReceiptDetailsResponse) => void
}
