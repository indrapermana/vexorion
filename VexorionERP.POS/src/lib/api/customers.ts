import type { CreateCustomerRequest, CustomerDetailsResponse, CustomerListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getCustomers() {
  return requestJson<CustomerListItemResponse[]>('/customers')
}

export function createCustomer(request: CreateCustomerRequest) {
  return requestJson<CustomerDetailsResponse>('/customers', 'POST', request)
}
