export type ProductListItemResponse = {
  id: string
  sku: string
  name: string
  imageUrl?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}

export type ProductSupplierLatestPurchasePriceResponse = {
  supplierId: string
  supplierNumber: string
  supplierName: string
  latestUnitCost: number
  invoiceDate: string
  invoiceNumber: string
  currencyCode: string
}

export type ProductDetailsResponse = {
  id: string
  tenantId: string
  sku: string
  name: string
  imageUrl?: string | null
  description?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}

export type ProductImageUploadResponse = {
  productId: string
  imageUrl: string
  thumbnailUrl?: string | null
}

export type ProductCategoryListItemResponse = {
  id: string
  name: string
  isActive: boolean
}

export type ProductCategoryDetailsResponse = {
  id: string
  tenantId: string
  name: string
  isActive: boolean
}

export type ProductIdentifierListItemResponse = {
  id: string
  productId: string
  codeType: string
  codeValue: string
  isPrimary: boolean
  isActive: boolean
}

export type ProductIdentifierDetailsResponse = {
  id: string
  tenantId: string
  productId: string
  codeType: string
  codeValue: string
  isPrimary: boolean
  isActive: boolean
}
