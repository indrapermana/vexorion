import type {
  CreateSalesShipmentRequest,
  SalesShipmentDetailsResponse,
  SalesShipmentListItemResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getSalesShipmentsForOrder(salesOrderId: string) {
  return requestJson<SalesShipmentListItemResponse[]>(`/sales-shipments/by-order/${salesOrderId}`)
}

export function getSalesShipment(shipmentId: string) {
  return requestJson<SalesShipmentDetailsResponse>(`/sales-shipments/${shipmentId}`)
}

export function createSalesShipment(request: CreateSalesShipmentRequest) {
  return requestJson<SalesShipmentDetailsResponse>('/sales-shipments', 'POST', request)
}

export function postSalesShipment(shipmentId: string) {
  return requestJson<SalesShipmentDetailsResponse>(`/sales-shipments/${shipmentId}/post`, 'POST')
}

export function deleteSalesShipment(shipmentId: string) {
  return requestJson<void>(`/sales-shipments/${shipmentId}`, 'DELETE')
}
