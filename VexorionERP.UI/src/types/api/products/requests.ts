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

export type CreateProductCategoryRequest = {
  name: string
}

export type UpdateProductCategoryRequest = {
  name: string
  isActive: boolean
}

export type CreateProductIdentifierRequest = {
  productId: string
  codeType: string
  codeValue: string
  isPrimary: boolean
}

export type UpdateProductIdentifierRequest = {
  codeType: string
  codeValue: string
  isPrimary: boolean
  isActive: boolean
}