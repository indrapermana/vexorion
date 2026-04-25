import type {
  ProductListItemResponse,
  PurchaseOrderLineListItemResponse,
  SalesOrderLineListItemResponse,
} from '../api'

export type SalesOrderLineDialogMode = 'create' | 'edit'
export type PurchaseOrderLineDialogMode = 'create' | 'edit'

export type SalesOrderLineGridRow = SalesOrderLineListItemResponse & {
  productName?: string
  productSku?: string
}

export type PurchaseOrderLineGridRow = PurchaseOrderLineListItemResponse & {
  productName?: string
  productSku?: string
}

export type SalesOrderLineFormValues = {
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  isActive: boolean
}

export type PurchaseOrderLineFormValues = {
  productId: string
  quantity: number
  unitCost: number
  isActive: boolean
}

export type SalesOrderLineEditorDialogProps = {
  open: boolean
  mode: SalesOrderLineDialogMode
  line?: SalesOrderLineListItemResponse | null
  products: ProductListItemResponse[]
  onClose: () => void
  onSaved: (mode: SalesOrderLineDialogMode, values: SalesOrderLineFormValues) => void | Promise<void>
}

export type PurchaseOrderLineEditorDialogProps = {
  open: boolean
  mode: PurchaseOrderLineDialogMode
  line?: PurchaseOrderLineListItemResponse | null
  products: ProductListItemResponse[]
  onClose: () => void
  onSaved: (mode: PurchaseOrderLineDialogMode, values: PurchaseOrderLineFormValues) => void | Promise<void>
}