import type {
  CreateStockTransferLineRequest,
  CreateStockTransferRequest,
  StockTransferDetailsResponse,
  StockTransferLineDetailsResponse,
  StockTransferListItemResponse,
  UpdateStockTransferLineRequest,
  UpdateStockTransferRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getStockTransfers() {
  return requestJson<StockTransferListItemResponse[]>('/stock-transfers')
}

export function getStockTransfer(stockTransferId: string) {
  return requestJson<StockTransferDetailsResponse>(`/stock-transfers/${stockTransferId}`)
}

export function createStockTransfer(request: CreateStockTransferRequest) {
  return requestJson<StockTransferDetailsResponse>('/stock-transfers', 'POST', request)
}

export function updateStockTransfer(stockTransferId: string, request: UpdateStockTransferRequest) {
  return requestJson<StockTransferDetailsResponse>(`/stock-transfers/${stockTransferId}`, 'PUT', request)
}

export function deleteStockTransfer(stockTransferId: string) {
  return requestJson<void>(`/stock-transfers/${stockTransferId}`, 'DELETE')
}

export function createStockTransferLine(stockTransferId: string, request: CreateStockTransferLineRequest) {
  return requestJson<StockTransferLineDetailsResponse>(`/stock-transfers/${stockTransferId}/lines`, 'POST', request)
}

export function updateStockTransferLine(stockTransferId: string, stockTransferLineId: string, request: UpdateStockTransferLineRequest) {
  return requestJson<StockTransferLineDetailsResponse>(`/stock-transfers/${stockTransferId}/lines/${stockTransferLineId}`, 'PUT', request)
}

export function deleteStockTransferLine(stockTransferId: string, stockTransferLineId: string) {
  return requestJson<void>(`/stock-transfers/${stockTransferId}/lines/${stockTransferLineId}`, 'DELETE')
}