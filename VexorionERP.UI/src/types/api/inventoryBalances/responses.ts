export type InventoryBalanceListItemResponse = {
  id: string
  productId: string
  warehouseId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  isActive: boolean
}