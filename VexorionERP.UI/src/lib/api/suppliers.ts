import type {
  CreateSupplierRequest,
  SupplierDetailsResponse,
  SupplierListItemResponse,
  UpdateSupplierRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getSuppliers() {
  return requestJson<SupplierListItemResponse[]>('/suppliers')
}

export function getSupplier(supplierId: string) {
  return requestJson<SupplierDetailsResponse>(`/suppliers/${supplierId}`)
}

export function createSupplier(request: CreateSupplierRequest) {
  return requestJson<SupplierDetailsResponse>('/suppliers', 'POST', request)
}

export function updateSupplier(supplierId: string, request: UpdateSupplierRequest) {
  return requestJson<SupplierDetailsResponse>(`/suppliers/${supplierId}`, 'PUT', request)
}

export function deleteSupplier(supplierId: string) {
  return requestJson<void>(`/suppliers/${supplierId}`, 'DELETE')
}