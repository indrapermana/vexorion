export type CreateUserRequest = {
  userName: string
  email: string
  password: string
  firstName?: string | null
  lastName?: string | null
  employeeId?: string | null
  roles: string[]
}

export type DisableUserRequest = {
  isActive: boolean
}

export type AssignUserRolesRequest = {
  roles: string[]
}

export type CreateTaxCodeRequest = {
  code: string
  name: string
  ratePercent: number
  isInclusive: boolean
}

export type UpdateTaxCodeRequest = CreateTaxCodeRequest

export type UpdateCompanyRequest = {
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

export type UpdateMenuConfigurationRequest = {
  hiddenMenuLinks: string[]
}

export type UpdateDiscountConfigurationRequest = {
  defaultDiscountPercent: number
  maxManualDiscountPercent: number
  allowNegativeDiscount: boolean
}

export type UpsertNumberingSequenceRequest = {
  documentType: string
  prefixTemplate: string
  nextNumber: number
  numberPadding: number
  resetPeriod: 0 | 1 | 2 | 3
}
