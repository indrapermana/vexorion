export type CreateWarehouseRequest = {
  code: string
  name: string
  locationDescription?: string | null
}

export type UpdateWarehouseRequest = CreateWarehouseRequest & {
  isActive: boolean
}