import type { CreateSalesShipmentRequest, SalesShipmentDetailsResponse } from '../../types/api'
import { requestJson } from './core'

export function createSalesShipment(request: CreateSalesShipmentRequest) {
  return requestJson<SalesShipmentDetailsResponse>('/sales-shipments', 'POST', request)
}

export function postSalesShipment(shipmentId: string) {
  return requestJson<SalesShipmentDetailsResponse>(`/sales-shipments/${shipmentId}/post`, 'POST')
}
