import type { ProductDetailsResponse, ProductListItemResponse } from '../api'

export type ProductDialogMode = 'create' | 'edit'

export type ProductWarehouseStockRow = {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  isWarehouseActive: boolean
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
}

export type ProductGridRow = ProductListItemResponse & {
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  activeQuantityOnHand: number
  activeQuantityReserved: number
  activeQuantityAvailable: number
  isLowStock: boolean
  warehouseStock: ProductWarehouseStockRow[]
}

export type ProductFormValues = {
  sku: string
  name: string
  description: string
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}

export type ProductEditorDialogProps = {
  open: boolean
  mode: ProductDialogMode
  productId?: string | null
  onClose: () => void
  onSaved: (product: ProductDetailsResponse, mode: ProductDialogMode) => void
}