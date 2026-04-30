export type TenantListItemResponse = {
  id: string
  name: string
  code: string
  domain?: string | null
  isActive: boolean
  createdAtUtc: string
}

export type UpdateTenantRequest = {
  name: string
  domain?: string | null
  isActive: boolean
}
