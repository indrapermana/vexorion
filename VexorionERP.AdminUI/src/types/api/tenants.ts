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

export type OnboardTenantRequest = {
  tenantName: string
  tenantCode: string
  domain?: string
  companyName: string
  companyCode: string
  adminUserName: string
  adminEmail: string
  adminPassword: string
  firstName: string
  lastName: string
}

export type OnboardTenantResponse = {
  tenantId: string
  tenantCode: string
  adminUserId: string
  adminUserName: string
}

export type TenantPreferencesResponse = {
  hiddenMenuLinks: string[]
  defaultDiscountPercent: number
  maxManualDiscountPercent: number
  allowNegativeDiscount: boolean
}

export type TenantTelemetryListItemResponse = {
  tenantId: string
  loginCount: number
  mostVisitedPage?: string | null
  mostVisitedPageVisits: number
}

export type TenantTelemetryResponse = {
  tenants: TenantTelemetryListItemResponse[]
}
