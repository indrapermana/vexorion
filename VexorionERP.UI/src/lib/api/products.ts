import type {
  CreateProductCategoryRequest,
  CreateProductIdentifierRequest,
  CreateProductRequest,
  ProductCategoryDetailsResponse,
  ProductCategoryListItemResponse,
  ProductDetailsResponse,
  ProductIdentifierDetailsResponse,
  ProductIdentifierListItemResponse,
  ProductImageUploadResponse,
  ProductListItemResponse,
  ProductPurchasePriceHistoryEntryResponse,
  ProductSupplierLatestPurchasePriceResponse,
  UpdateProductCategoryRequest,
  UpdateProductIdentifierRequest,
  UpdateProductRequest,
} from '../../types/api'
import { apiClient, requestJson } from './core'

export function getProducts() {
  return requestJson<ProductListItemResponse[]>('/products')
}

export function getProduct(productId: string) {
  return requestJson<ProductDetailsResponse>(`/products/${productId}`)
}

export function createProduct(request: CreateProductRequest) {
  return requestJson<ProductDetailsResponse>('/products', 'POST', request)
}

export async function uploadProductImage(productId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<ProductImageUploadResponse>(`/products/${productId}/image`, formData)
  return response.data
}

export function updateProduct(productId: string, request: UpdateProductRequest) {
  return requestJson<ProductDetailsResponse>(`/products/${productId}`, 'PUT', request)
}

export function deleteProduct(productId: string) {
  return requestJson<void>(`/products/${productId}`, 'DELETE')
}

export function getProductPurchasePriceHistory(productId: string) {
  return requestJson<ProductSupplierLatestPurchasePriceResponse[]>(`/products/${productId}/purchase-price-history`)
}

export function getProductPurchasePriceHistoryEntries(productId: string, fromDate: string) {
  const params = new URLSearchParams({ fromDate })
  return requestJson<ProductPurchasePriceHistoryEntryResponse[]>(`/products/${productId}/purchase-price-history/entries?${params}`)
}

// Product Categories
export function getProductCategories() {
  return requestJson<ProductCategoryListItemResponse[]>('/product-categories')
}

export function getProductCategory(categoryId: string) {
  return requestJson<ProductCategoryDetailsResponse>(`/product-categories/${categoryId}`)
}

export function createProductCategory(request: CreateProductCategoryRequest) {
  return requestJson<ProductCategoryDetailsResponse>('/product-categories', 'POST', request)
}

export function updateProductCategory(categoryId: string, request: UpdateProductCategoryRequest) {
  return requestJson<ProductCategoryDetailsResponse>(`/product-categories/${categoryId}`, 'PUT', request)
}

export function deleteProductCategory(categoryId: string) {
  return requestJson<void>(`/product-categories/${categoryId}`, 'DELETE')
}

// Product Identifiers
export function getProductIdentifiers(productId: string) {
  return requestJson<ProductIdentifierListItemResponse[]>(`/product-identifiers?productId=${productId}`)
}

export function getProductIdentifier(identifierId: string) {
  return requestJson<ProductIdentifierDetailsResponse>(`/product-identifiers/${identifierId}`)
}

export function createProductIdentifier(request: CreateProductIdentifierRequest) {
  return requestJson<ProductIdentifierDetailsResponse>('/product-identifiers', 'POST', request)
}

export function updateProductIdentifier(identifierId: string, request: UpdateProductIdentifierRequest) {
  return requestJson<ProductIdentifierDetailsResponse>(`/product-identifiers/${identifierId}`, 'PUT', request)
}

export function deleteProductIdentifier(identifierId: string) {
  return requestJson<void>(`/product-identifiers/${identifierId}`, 'DELETE')
}
