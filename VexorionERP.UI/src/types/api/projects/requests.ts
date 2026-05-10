export type ProjectLifecycleStatus = 1 | 2 | 3 | 4 | 5 | 6

export type TenantRelationshipType = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type CreateProjectCategoryRequest = {
  code: string
  name: string
  description?: string | null
}

export type UpdateProjectCategoryRequest = CreateProjectCategoryRequest & {
  isActive: boolean
}

export type CreateProjectRequest = {
  projectCategoryId: string
  projectNumber: string
  name: string
  governmentAgency?: string | null
  submissionReference?: string | null
  startDate: string
  endDate?: string | null
  status: ProjectLifecycleStatus
  notes?: string | null
}

export type UpdateProjectRequest = CreateProjectRequest & {
  isActive: boolean
}

export type ProjectListFilterRequest = {
  status?: ProjectLifecycleStatus
  relatedTenantId?: string
}

export type CreateProjectPartyRequest = {
  relatedTenantId: string
  relationshipType: TenantRelationshipType
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canAssignPeople: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export type UpdateProjectPartyRequest = CreateProjectPartyRequest & {
  isActive: boolean
}
