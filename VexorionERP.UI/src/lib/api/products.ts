import type {
  CreateProductRequest,
  ProductDetailsResponse,
  ProductListItemResponse,
  ProductSupplierLatestPurchasePriceResponse,
  UpdateProductRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getProducts() {
  return requestJson<ProductListItemResponse[]>('/products')
}

export function getProduct(productId: string) {
  return requestJson<ProductDetailsResponse>(`/products/${productId}`)
}

export function createProduct(request: CreateProductRequest) {
  return requestJson<ProductDetailsResponse>('/products', 'POST', request)
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