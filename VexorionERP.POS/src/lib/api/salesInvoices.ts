import type {
  CreateCustomerPaymentRequest,
  CreateSalesInvoiceLineRequest,
  CreateSalesInvoiceRequest,
  CustomerPaymentDetailsResponse,
  SalesInvoiceDetailsResponse,
} from '../../types/api'
import { requestJson } from './core'

export function createSalesInvoice(request: CreateSalesInvoiceRequest) {
  return requestJson<SalesInvoiceDetailsResponse>('/sales-invoices', 'POST', request)
}

export function createSalesInvoiceLine(salesInvoiceId: string, request: CreateSalesInvoiceLineRequest) {
  return requestJson<void>(`/sales-invoices/${salesInvoiceId}/lines`, 'POST', request)
}

export function createCustomerPayment(request: CreateCustomerPaymentRequest) {
  return requestJson<CustomerPaymentDetailsResponse>('/customer-payments', 'POST', request)
}
