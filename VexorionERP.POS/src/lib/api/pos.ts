import type { PosSessionResponse, PosStockValidationRequest, PosStockValidationResponse } from '../../types/api'
import { requestJson } from './core'

export function getPosSession() {
  return requestJson<PosSessionResponse>('/pos/session')
}

export function validatePosStock(request: PosStockValidationRequest) {
  return requestJson<PosStockValidationResponse>('/pos/validate-stock', 'POST', request)
}
