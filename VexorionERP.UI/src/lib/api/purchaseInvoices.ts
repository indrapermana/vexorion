import type {
  CreatePurchaseInvoiceLineRequest,
  CreatePurchaseInvoiceRequest,
  CreateVendorPaymentRequest,
  PurchaseInvoiceDetailsResponse,
  PurchaseInvoiceLineDetailsResponse,
  PurchaseInvoiceLineListItemResponse,
  PurchaseInvoiceListItemResponse,
  UpdatePurchaseInvoiceLineRequest,
  UpdatePurchaseInvoiceRequest,
  VendorPaymentDetailsResponse,
  VendorPaymentListItemResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getPurchaseInvoices(outstandingOnly = false) {
  const searchParams = new URLSearchParams()
  if (outstandingOnly) {
    searchParams.set('outstandingOnly', 'true')
  }

  return requestJson<PurchaseInvoiceListItemResponse[]>(`/purchase-invoices${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`)
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

export function getVendorPayments() {
  return requestJson<VendorPaymentListItemResponse[]>('/vendor-payments')
}

export function getVendorPaymentsForInvoice(purchaseInvoiceId: string) {
  const searchParams = new URLSearchParams({ purchaseInvoiceId })
  return requestJson<VendorPaymentListItemResponse[]>(`/vendor-payments?${searchParams.toString()}`)
}

export function getVendorPayment(vendorPaymentId: string) {
  return requestJson<VendorPaymentDetailsResponse>(`/vendor-payments/${vendorPaymentId}`)
}

export function createVendorPayment(request: CreateVendorPaymentRequest) {
  return requestJson<VendorPaymentDetailsResponse>('/vendor-payments', 'POST', request)
}