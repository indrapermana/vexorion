import type {
  CreateInventoryAdjustmentLineRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentDetailsResponse,
  InventoryAdjustmentLineDetailsResponse,
  InventoryAdjustmentListItemResponse,
  UpdateInventoryAdjustmentLineRequest,
  UpdateInventoryAdjustmentRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getInventoryAdjustments() {
  return requestJson<InventoryAdjustmentListItemResponse[]>('/inventory-adjustments')
}

export function getInventoryAdjustment(inventoryAdjustmentId: string) {
  return requestJson<InventoryAdjustmentDetailsResponse>(`/inventory-adjustments/${inventoryAdjustmentId}`)
}

export function createInventoryAdjustment(request: CreateInventoryAdjustmentRequest) {
  return requestJson<InventoryAdjustmentDetailsResponse>('/inventory-adjustments', 'POST', request)
}

export function updateInventoryAdjustment(inventoryAdjustmentId: string, request: UpdateInventoryAdjustmentRequest) {
  return requestJson<InventoryAdjustmentDetailsResponse>(`/inventory-adjustments/${inventoryAdjustmentId}`, 'PUT', request)
}

export function deleteInventoryAdjustment(inventoryAdjustmentId: string) {
  return requestJson<void>(`/inventory-adjustments/${inventoryAdjustmentId}`, 'DELETE')
}

export function createInventoryAdjustmentLine(inventoryAdjustmentId: string, request: CreateInventoryAdjustmentLineRequest) {
  return requestJson<InventoryAdjustmentLineDetailsResponse>(`/inventory-adjustments/${inventoryAdjustmentId}/lines`, 'POST', request)
}

export function updateInventoryAdjustmentLine(inventoryAdjustmentId: string, inventoryAdjustmentLineId: string, request: UpdateInventoryAdjustmentLineRequest) {
  return requestJson<InventoryAdjustmentLineDetailsResponse>(`/inventory-adjustments/${inventoryAdjustmentId}/lines/${inventoryAdjustmentLineId}`, 'PUT', request)
}

export function deleteInventoryAdjustmentLine(inventoryAdjustmentId: string, inventoryAdjustmentLineId: string) {
  return requestJson<void>(`/inventory-adjustments/${inventoryAdjustmentId}/lines/${inventoryAdjustmentLineId}`, 'DELETE')
}