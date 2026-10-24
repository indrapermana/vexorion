import type {
  PosCheckoutRequest,
  PosCheckoutResponse,
  PosRefundRequest,
  PosRefundResponse,
  PosRefundEligibleLinesResponse,
  PosSessionResponse,
  PosStockValidationRequest,
  PosStockValidationResponse,
  OpenShiftRequest,
  CloseShiftRequest,
  ShiftSessionResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getPosSession() {
  return requestJson<PosSessionResponse>('/pos/session')
}

export function validatePosStock(request: PosStockValidationRequest) {
  return requestJson<PosStockValidationResponse>('/pos/validate-stock', 'POST', request)
}

export function checkoutSale(request: PosCheckoutRequest) {
  return requestJson<PosCheckoutResponse>('/pos/checkout', 'POST', request)
}

export function refundSale(request: PosRefundRequest) {
  return requestJson<PosRefundResponse>('/pos/refund', 'POST', request)
}

export function getPosRefundEligibleLines(salesInvoiceId: string) {
  return requestJson<PosRefundEligibleLinesResponse>(`/pos/refund/${salesInvoiceId}/lines`)
}

export function openShiftApi(request: OpenShiftRequest) {
  return requestJson<ShiftSessionResponse>('/pos/shifts/open', 'POST', request)
}

export function closeShiftApi(shiftId: string, request: CloseShiftRequest) {
  return requestJson<ShiftSessionResponse>(`/pos/shifts/${shiftId}/close`, 'POST', request)
}

export function getCurrentShiftApi() {
  return requestJson<ShiftSessionResponse>('/pos/shifts/current')
}
