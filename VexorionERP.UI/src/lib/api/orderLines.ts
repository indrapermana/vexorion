import type {
  CreatePurchaseOrderLineRequest,
  CreateSalesOrderLineRequest,
  PurchaseOrderLineListItemResponse,
  SalesOrderLineListItemResponse,
  UpdatePurchaseOrderLineRequest,
  UpdateSalesOrderLineRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getSalesOrderLines(salesOrderId: string) {
  return requestJson<SalesOrderLineListItemResponse[]>(`/sales-orders/${salesOrderId}/lines`)
}

export function createSalesOrderLine(salesOrderId: string, request: CreateSalesOrderLineRequest) {
  return requestJson<SalesOrderLineListItemResponse>(`/sales-orders/${salesOrderId}/lines`, 'POST', request)
}

export function updateSalesOrderLine(salesOrderId: string, salesOrderLineId: string, request: UpdateSalesOrderLineRequest) {
  return requestJson<SalesOrderLineListItemResponse>(`/sales-orders/${salesOrderId}/lines/${salesOrderLineId}`, 'PUT', request)
}

export function deleteSalesOrderLine(salesOrderId: string, salesOrderLineId: string) {
  return requestJson<void>(`/sales-orders/${salesOrderId}/lines/${salesOrderLineId}`, 'DELETE')
}

export function getPurchaseOrderLines(purchaseOrderId: string) {
  return requestJson<PurchaseOrderLineListItemResponse[]>(`/purchase-orders/${purchaseOrderId}/lines`)
}

export function createPurchaseOrderLine(purchaseOrderId: string, request: CreatePurchaseOrderLineRequest) {
  return requestJson<PurchaseOrderLineListItemResponse>(`/purchase-orders/${purchaseOrderId}/lines`, 'POST', request)
}

export function updatePurchaseOrderLine(purchaseOrderId: string, purchaseOrderLineId: string, request: UpdatePurchaseOrderLineRequest) {
  return requestJson<PurchaseOrderLineListItemResponse>(`/purchase-orders/${purchaseOrderId}/lines/${purchaseOrderLineId}`, 'PUT', request)
}

export function deletePurchaseOrderLine(purchaseOrderId: string, purchaseOrderLineId: string) {
  return requestJson<void>(`/purchase-orders/${purchaseOrderId}/lines/${purchaseOrderLineId}`, 'DELETE')
}