import type { CreateSalesOrderLineRequest, SalesOrderLineListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function createSalesOrderLine(salesOrderId: string, request: CreateSalesOrderLineRequest) {
  return requestJson<SalesOrderLineListItemResponse>(`/sales-orders/${salesOrderId}/lines`, 'POST', request)
}
