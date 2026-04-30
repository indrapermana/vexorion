export type UserListItemResponse = {
  id: string
  tenantId: string
  userName: string
  email: string
  firstName?: string | null
  lastName?: string | null
  isActive: boolean
  roles: string[]
}

export type RolePermissionsResponse = {
  role: string
  permissions: string[]
}

export type TaxCodeListItemResponse = {
  id: string
  code: string
  name: string
  ratePercent: number
  isInclusive: boolean
}

export type TaxCodeDetailsResponse = {
  id: string
  tenantId: string
  code: string
  name: string
  ratePercent: number
  isInclusive: boolean
}

export type CompanyListItemResponse = {
  id: string
  name: string
  code: string
  email?: string | null
  isActive: boolean
  currencyCode: string
}

export type CompanyDetailsResponse = {
  id: string
  tenantId: string
  name: string
  code: string
  taxNumber?: string | null
  email?: string | null
  phoneNumber?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  isActive: boolean
  currencyCode: string
}

export type TenantPreferencesResponse = {
  hiddenMenuLinks: string[]
  defaultDiscountPercent: number
  maxManualDiscountPercent: number
  allowNegativeDiscount: boolean
}
