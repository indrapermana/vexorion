import type {
  CreatePurchaseReceiptRequest,
  PurchaseReceiptDetailsResponse,
  PurchaseReceiptListItemResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getPurchaseReceiptsForOrder(purchaseOrderId: string) {
  return requestJson<PurchaseReceiptListItemResponse[]>(`/purchase-receipts/by-order/${purchaseOrderId}`)
}

export function getPurchaseReceipt(receiptId: string) {
  return requestJson<PurchaseReceiptDetailsResponse>(`/purchase-receipts/${receiptId}`)
}

export function createPurchaseReceipt(request: CreatePurchaseReceiptRequest) {
  return requestJson<PurchaseReceiptDetailsResponse>('/purchase-receipts', 'POST', request)
}

export function postPurchaseReceipt(receiptId: string) {
  return requestJson<PurchaseReceiptDetailsResponse>(`/purchase-receipts/${receiptId}/post`, 'POST')
}

export function deletePurchaseReceipt(receiptId: string) {
  return requestJson<void>(`/purchase-receipts/${receiptId}`, 'DELETE')
}
