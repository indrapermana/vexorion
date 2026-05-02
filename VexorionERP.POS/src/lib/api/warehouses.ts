import type { WarehouseListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getWarehouses() {
  return requestJson<WarehouseListItemResponse[]>('/warehouses')
}
