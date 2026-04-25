import type {
  CreatePurchaseInvoiceLineRequest,
  CreatePurchaseInvoiceRequest,
  PurchaseInvoiceDetailsResponse,
  PurchaseInvoiceLineDetailsResponse,
  PurchaseInvoiceLineListItemResponse,
  PurchaseInvoiceListItemResponse,
  UpdatePurchaseInvoiceLineRequest,
  UpdatePurchaseInvoiceRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getPurchaseInvoices() {
  return requestJson<PurchaseInvoiceListItemResponse[]>('/purchase-invoices')
}

export function getPurchaseInvoice(purchaseInvoiceId: string) {
  return requestJson<PurchaseInvoiceDetailsResponse>(`/purchase-invoices/${purchaseInvoiceId}`)
}

export function createPurchaseInvoice(request: CreatePurchaseInvoiceRequest) {
  return requestJson<PurchaseInvoiceDetailsResponse>('/purchase-invoices', 'POST', request)
}

export function updatePurchaseInvoice(purchaseInvoiceId: string, request: UpdatePurchaseInvoiceRequest) {
  return requestJson<PurchaseInvoiceDetailsResponse>(`/purchase-invoices/${purchaseInvoiceId}`, 'PUT', request)
}

export function deletePurchaseInvoice(purchaseInvoiceId: string) {
  return requestJson<void>(`/purchase-invoices/${purchaseInvoiceId}`, 'DELETE')
}

export function getPurchaseInvoiceLines(purchaseInvoiceId: string) {
  return requestJson<PurchaseInvoiceLineListItemResponse[]>(`/purchase-invoices/${purchaseInvoiceId}/lines`)
}

export function createPurchaseInvoiceLine(purchaseInvoiceId: string, request: CreatePurchaseInvoiceLineRequest) {
  return requestJson<PurchaseInvoiceLineDetailsResponse>(`/purchase-invoices/${purchaseInvoiceId}/lines`, 'POST', request)
}

export function updatePurchaseInvoiceLine(purchaseInvoiceId: string, purchaseInvoiceLineId: string, request: UpdatePurchaseInvoiceLineRequest) {
  return requestJson<PurchaseInvoiceLineDetailsResponse>(`/purchase-invoices/${purchaseInvoiceId}/lines/${purchaseInvoiceLineId}`, 'PUT', request)
}

export function deletePurchaseInvoiceLine(purchaseInvoiceId: string, purchaseInvoiceLineId: string) {
  return requestJson<void>(`/purchase-invoices/${purchaseInvoiceId}/lines/${purchaseInvoiceLineId}`, 'DELETE')
}