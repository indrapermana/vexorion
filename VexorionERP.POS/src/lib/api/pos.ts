import type {
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

export function openShiftApi(request: OpenShiftRequest) {
  return requestJson<ShiftSessionResponse>('/pos/shifts/open', 'POST', request)
}

export function closeShiftApi(shiftId: string, request: CloseShiftRequest) {
  return requestJson<ShiftSessionResponse>(`/pos/shifts/${shiftId}/close`, 'POST', request)
}

export function getCurrentShiftApi() {
  return requestJson<ShiftSessionResponse>('/pos/shifts/current')
}
