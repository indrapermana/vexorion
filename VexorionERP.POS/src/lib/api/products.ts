import type { ProductListItemResponse } from '../../types/api'
import { apiClient, requestJson } from './core'

export function getProducts() {
  return requestJson<ProductListItemResponse[]>('/products')
}

export async function uploadProductImage(productId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<{ productId: string; imageUrl: string }>(`/products/${productId}/image`, formData)
  return response.data
}
