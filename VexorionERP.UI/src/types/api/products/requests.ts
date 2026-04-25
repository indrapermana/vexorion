export type CreateProductRequest = {
  sku: string
  name: string
  description?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
}

export type UpdateProductRequest = {
  sku: string
  name: string
  description?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}