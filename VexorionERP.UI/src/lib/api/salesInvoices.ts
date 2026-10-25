import type {
  CreateCustomerPaymentRequest,
  CreateSalesInvoiceLineRequest,
  CreateSalesInvoiceRequest,
  CustomerPaymentDetailsResponse,
  CustomerPaymentListItemResponse,
  SalesInvoiceDetailsResponse,
  SalesInvoiceLineDetailsResponse,
  SalesInvoiceLineListItemResponse,
  SalesInvoiceListItemResponse,
  UpdateSalesInvoiceLineRequest,
  UpdateSalesInvoiceRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getSalesInvoices(outstandingOnly = false) {
  const searchParams = new URLSearchParams()
  if (outstandingOnly) {
    searchParams.set('outstandingOnly', 'true')
  }

  return requestJson<SalesInvoiceListItemResponse[]>(`/sales-invoices${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`)
}

export function getSalesInvoice(salesInvoiceId: string) {
  return requestJson<SalesInvoiceDetailsResponse>(`/sales-invoices/${salesInvoiceId}`)
}

export function createSalesInvoice(request: CreateSalesInvoiceRequest) {
  return requestJson<SalesInvoiceDetailsResponse>('/sales-invoices', 'POST', request)
}

export function updateSalesInvoice(salesInvoiceId: string, request: UpdateSalesInvoiceRequest) {
  return requestJson<SalesInvoiceDetailsResponse>(`/sales-invoices/${salesInvoiceId}`, 'PUT', request)
}

export function deleteSalesInvoice(salesInvoiceId: string) {
  return requestJson<void>(`/sales-invoices/${salesInvoiceId}`, 'DELETE')
}

export function getSalesInvoiceLines(salesInvoiceId: string) {
  return requestJson<SalesInvoiceLineListItemResponse[]>(`/sales-invoices/${salesInvoiceId}/lines`)
}

export function createSalesInvoiceLine(salesInvoiceId: string, request: CreateSalesInvoiceLineRequest) {
  return requestJson<SalesInvoiceLineDetailsResponse>(`/sales-invoices/${salesInvoiceId}/lines`, 'POST', request)
}

export function updateSalesInvoiceLine(salesInvoiceId: string, salesInvoiceLineId: string, request: UpdateSalesInvoiceLineRequest) {
  return requestJson<SalesInvoiceLineDetailsResponse>(`/sales-invoices/${salesInvoiceId}/lines/${salesInvoiceLineId}`, 'PUT', request)
}

export function deleteSalesInvoiceLine(salesInvoiceId: string, salesInvoiceLineId: string) {
  return requestJson<void>(`/sales-invoices/${salesInvoiceId}/lines/${salesInvoiceLineId}`, 'DELETE')
}

export function getCustomerPayments() {
  return requestJson<CustomerPaymentListItemResponse[]>('/customer-payments')
}

export function getCustomerPaymentsForInvoice(salesInvoiceId: string) {
  const searchParams = new URLSearchParams({ salesInvoiceId })
  return requestJson<CustomerPaymentListItemResponse[]>(`/customer-payments?${searchParams.toString()}`)
}

export function getCustomerPayment(customerPaymentId: string) {
  return requestJson<CustomerPaymentDetailsResponse>(`/customer-payments/${customerPaymentId}`)
}

export function createCustomerPayment(request: CreateCustomerPaymentRequest) {
  return requestJson<CustomerPaymentDetailsResponse>('/customer-payments', 'POST', request)
}