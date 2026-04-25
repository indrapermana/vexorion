import type { InventoryBalanceListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getInventoryBalances() {
  return requestJson<InventoryBalanceListItemResponse[]>('/inventory-balances')
}