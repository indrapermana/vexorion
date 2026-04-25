export type WarehouseListItemResponse = {
  id: string
  code: string
  name: string
  isActive: boolean
}

export type WarehouseDetailsResponse = {
  id: string
  tenantId: string
  code: string
  name: string
  locationDescription?: string | null
  isActive: boolean
}