import type { CreateSalesOrderRequest, SalesOrderDetailsResponse } from '../../types/api'
import { requestJson } from './core'

export function createSalesOrder(request: CreateSalesOrderRequest) {
  return requestJson<SalesOrderDetailsResponse>('/sales-orders', 'POST', request)
}
