import type { ProductDetailsResponse, ProductListItemResponse } from '../api'

export type ProductDialogMode = 'create' | 'edit'

export type ProductGridRow = ProductListItemResponse

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