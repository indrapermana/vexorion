export type ProductListItemResponse = {
  id: string
  sku: string
  name: string
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
  description?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}