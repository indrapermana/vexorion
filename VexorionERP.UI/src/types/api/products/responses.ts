export type ProductListItemResponse = {
  id: string
  sku: string
  name: string
  unitOfMeasure: string
  salesPrice: number
  isActive: boolean
}

export type ProductDetailsResponse = {
  id: string
  tenantId: string
  sku: string
  name: string
  description?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}