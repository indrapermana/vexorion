import type {
  CreateSalesOrderRequest,
  SalesOrderDetailsResponse,
  SalesOrderListItemResponse,
  UpdateSalesOrderRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getSalesOrders() {
  return requestJson<SalesOrderListItemResponse[]>('/sales-orders')
}

export function getSalesOrder(salesOrderId: string) {
  return requestJson<SalesOrderDetailsResponse>(`/sales-orders/${salesOrderId}`)
}

export function createSalesOrder(request: CreateSalesOrderRequest) {
  return requestJson<SalesOrderDetailsResponse>('/sales-orders', 'POST', request)
}

export function updateSalesOrder(salesOrderId: string, request: UpdateSalesOrderRequest) {
  return requestJson<SalesOrderDetailsResponse>(`/sales-orders/${salesOrderId}`, 'PUT', request)
}

export function deleteSalesOrder(salesOrderId: string) {
  return requestJson<void>(`/sales-orders/${salesOrderId}`, 'DELETE')
}