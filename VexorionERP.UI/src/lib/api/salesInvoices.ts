import type {
  CreateSalesInvoiceLineRequest,
  CreateSalesInvoiceRequest,
  SalesInvoiceDetailsResponse,
  SalesInvoiceLineDetailsResponse,
  SalesInvoiceLineListItemResponse,
  SalesInvoiceListItemResponse,
  UpdateSalesInvoiceLineRequest,
  UpdateSalesInvoiceRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getSalesInvoices() {
  return requestJson<SalesInvoiceListItemResponse[]>('/sales-invoices')
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