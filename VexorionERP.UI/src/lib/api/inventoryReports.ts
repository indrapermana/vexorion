import type {
  InventoryMovementAuditResponse,
  InventoryReorderReportResponse,
  InventoryValuationReportResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getInventoryValuationReport(warehouseId?: string) {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : ''
  return requestJson<InventoryValuationReportResponse>(`/inventory-reports/valuation${query}`)
}

export function getInventoryMovementAuditReport(filters: {
  startDate?: string
  endDate?: string
  warehouseId?: string
  productId?: string
  skip?: number
  take?: number
}) {
  const query = new URLSearchParams()
  if (filters.startDate) query.set('startDate', filters.startDate)
  if (filters.endDate) query.set('endDate', filters.endDate)
  if (filters.warehouseId) query.set('warehouseId', filters.warehouseId)
  if (filters.productId) query.set('productId', filters.productId)
  query.set('skip', String(filters.skip ?? 0))
  query.set('take', String(filters.take ?? 100))
  return requestJson<InventoryMovementAuditResponse>(`/inventory-reports/movement-audit?${query.toString()}`)
}

export function getInventoryReorderReport() {
  return requestJson<InventoryReorderReportResponse>('/inventory-reports/reorder-recommendations')
}