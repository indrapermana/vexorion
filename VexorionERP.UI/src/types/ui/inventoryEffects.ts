export type InventoryEffectRow = {
  id: string
  product: string
  warehouse: string
  currentQuantity: number
  quantityChange: number
}

export function getInventoryAdjustmentEffect(previousStatus: number, nextStatus: number, quantityDelta: number) {
  if (previousStatus !== 4 && nextStatus === 4) return quantityDelta
  if (previousStatus === 4 && nextStatus === 5) return -quantityDelta
  return 0
}

export function getStockTransferEffect(previousStatus: number, nextStatus: number, quantity: number) {
  if (previousStatus !== 4 && nextStatus === 4) return { sourceDelta: -quantity, destinationDelta: quantity }
  if (previousStatus === 4 && nextStatus === 5) return { sourceDelta: quantity, destinationDelta: -quantity }
  return { sourceDelta: 0, destinationDelta: 0 }
}

export function getStockCountEffect(previousStatus: number, nextStatus: number, systemQuantity: number, countedQuantity: number) {
  const variance = countedQuantity - systemQuantity
  if (previousStatus !== 4 && nextStatus === 4) return variance
  if (previousStatus === 4 && nextStatus === 5) return -variance
  return 0
}
