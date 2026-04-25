import type {
  CreateStockCountLineRequest,
  CreateStockCountRequest,
  StockCountDetailsResponse,
  StockCountLineDetailsResponse,
  StockCountListItemResponse,
  UpdateStockCountLineRequest,
  UpdateStockCountRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getStockCounts() {
  return requestJson<StockCountListItemResponse[]>('/stock-counts')
}

export function getStockCount(stockCountId: string) {
  return requestJson<StockCountDetailsResponse>(`/stock-counts/${stockCountId}`)
}

export function createStockCount(request: CreateStockCountRequest) {
  return requestJson<StockCountDetailsResponse>('/stock-counts', 'POST', request)
}

export function updateStockCount(stockCountId: string, request: UpdateStockCountRequest) {
  return requestJson<StockCountDetailsResponse>(`/stock-counts/${stockCountId}`, 'PUT', request)
}

export function deleteStockCount(stockCountId: string) {
  return requestJson<void>(`/stock-counts/${stockCountId}`, 'DELETE')
}

export function createStockCountLine(stockCountId: string, request: CreateStockCountLineRequest) {
  return requestJson<StockCountLineDetailsResponse>(`/stock-counts/${stockCountId}/lines`, 'POST', request)
}

export function updateStockCountLine(stockCountId: string, stockCountLineId: string, request: UpdateStockCountLineRequest) {
  return requestJson<StockCountLineDetailsResponse>(`/stock-counts/${stockCountId}/lines/${stockCountLineId}`, 'PUT', request)
}

export function deleteStockCountLine(stockCountId: string, stockCountLineId: string) {
  return requestJson<void>(`/stock-counts/${stockCountId}/lines/${stockCountLineId}`, 'DELETE')
}
