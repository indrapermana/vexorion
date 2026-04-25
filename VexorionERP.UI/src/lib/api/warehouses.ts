import type {
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseDetailsResponse,
  WarehouseListItemResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getWarehouses() {
  return requestJson<WarehouseListItemResponse[]>('/warehouses')
}

export function getWarehouse(warehouseId: string) {
  return requestJson<WarehouseDetailsResponse>(`/warehouses/${warehouseId}`)
}

export function createWarehouse(request: CreateWarehouseRequest) {
  return requestJson<WarehouseDetailsResponse>('/warehouses', 'POST', request)
}

export function updateWarehouse(warehouseId: string, request: UpdateWarehouseRequest) {
  return requestJson<WarehouseDetailsResponse>(`/warehouses/${warehouseId}`, 'PUT', request)
}

export function deleteWarehouse(warehouseId: string) {
  return requestJson<void>(`/warehouses/${warehouseId}`, 'DELETE')
}