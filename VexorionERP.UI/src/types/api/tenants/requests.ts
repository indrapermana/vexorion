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

export type TenantRelationshipTypeValue = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type TenantRelationshipStatusValue = 1 | 2 | 3 | 4 | 5

export type CreateTenantRelationshipRequest = {
  relatedTenantId: string
  relationshipType: TenantRelationshipTypeValue
  effectiveFrom?: string | null
  effectiveTo?: string | null
  contractReference?: string | null
  scopeJson?: string | null
}

export type UpdateTenantRelationshipRequest = {
  relatedTenantId: string
  relationshipType: TenantRelationshipTypeValue
  status: TenantRelationshipStatusValue
  effectiveFrom?: string | null
  effectiveTo?: string | null
  contractReference?: string | null
  scopeJson?: string | null
}

export type ActivateTenantRelationshipRequest = {
  effectiveFrom?: string | null
  effectiveTo?: string | null
  scopeJson?: string | null
}

