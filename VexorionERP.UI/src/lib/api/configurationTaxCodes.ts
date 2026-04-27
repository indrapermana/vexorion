import type {
  CreateTaxCodeRequest,
  TaxCodeDetailsResponse,
  TaxCodeListItemResponse,
  UpdateTaxCodeRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getTaxCodes() {
  return requestJson<TaxCodeListItemResponse[]>('/tax-codes')
}

export function createTaxCode(request: CreateTaxCodeRequest) {
  return requestJson<TaxCodeDetailsResponse>('/tax-codes', 'POST', request)
}

export function updateTaxCode(taxCodeId: string, request: UpdateTaxCodeRequest) {
  return requestJson<TaxCodeDetailsResponse>(`/tax-codes/${taxCodeId}`, 'PUT', request)
}

export function deleteTaxCode(taxCodeId: string) {
  return requestJson<void>(`/tax-codes/${taxCodeId}`, 'DELETE')
}
