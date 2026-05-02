import type { ProductListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getProducts() {
  return requestJson<ProductListItemResponse[]>('/products')
}
