import type { ProjectLifecycleStatus, TenantRelationshipType } from './requests'

export type ProjectCategoryListItemResponse = {
  id: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
}

export type ProjectCategoryDetailsResponse = {
  id: string
  tenantId: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
}

export type ProjectListItemResponse = {
  id: string
  projectCategoryId: string
  projectNumber: string
  name: string
  startDate: string
  endDate?: string | null
  status: ProjectLifecycleStatus
  isActive: boolean
}

export type ProjectDetailsResponse = {
  id: string
  tenantId: string
  projectCategoryId: string
  projectNumber: string
  name: string
  governmentAgency?: string | null
  submissionReference?: string | null
  startDate: string
  endDate?: string | null
  status: ProjectLifecycleStatus
  notes?: string | null
  isActive: boolean
}

export type ProjectTimelineItemResponse = {
  id: string
  createdAtUtc: string
  eventType: string
  actorUserId?: string | null
  description?: string | null
  metadataJson?: string | null
}

export type ProjectPartyListItemResponse = {
  id: string
  projectId: string
  relatedTenantId: string
  relationshipType: TenantRelationshipType
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canAssignPeople: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isActive: boolean
}

export type ProjectPartyDetailsResponse = {
  id: string
  tenantId: string
  projectId: string
  relatedTenantId: string
  relationshipType: TenantRelationshipType
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canAssignPeople: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isActive: boolean
}
