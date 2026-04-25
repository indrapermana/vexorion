import type {
  CreatePurchaseOrderRequest,
  PurchaseOrderDetailsResponse,
  PurchaseOrderListItemResponse,
  UpdatePurchaseOrderRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getPurchaseOrders() {
  return requestJson<PurchaseOrderListItemResponse[]>('/purchase-orders')
}

export function getPurchaseOrder(purchaseOrderId: string) {
  return requestJson<PurchaseOrderDetailsResponse>(`/purchase-orders/${purchaseOrderId}`)
}

export function createPurchaseOrder(request: CreatePurchaseOrderRequest) {
  return requestJson<PurchaseOrderDetailsResponse>('/purchase-orders', 'POST', request)
}

export function updatePurchaseOrder(purchaseOrderId: string, request: UpdatePurchaseOrderRequest) {
  return requestJson<PurchaseOrderDetailsResponse>(`/purchase-orders/${purchaseOrderId}`, 'PUT', request)
}

export function deletePurchaseOrder(purchaseOrderId: string) {
  return requestJson<void>(`/purchase-orders/${purchaseOrderId}`, 'DELETE')
}