import type {
  CreateCustomerRequest,
  CustomerDetailsResponse,
  CustomerListItemResponse,
  UpdateCustomerRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getCustomers() {
  return requestJson<CustomerListItemResponse[]>('/customers')
}

export function getCustomer(customerId: string) {
  return requestJson<CustomerDetailsResponse>(`/customers/${customerId}`)
}

export function createCustomer(request: CreateCustomerRequest) {
  return requestJson<CustomerDetailsResponse>('/customers', 'POST', request)
}

export function updateCustomer(customerId: string, request: UpdateCustomerRequest) {
  return requestJson<CustomerDetailsResponse>(`/customers/${customerId}`, 'PUT', request)
}

export function deleteCustomer(customerId: string) {
  return requestJson<void>(`/customers/${customerId}`, 'DELETE')
}