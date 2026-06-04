import type { ManagedDocumentStatus, ProjectLifecycleStatus, TenantRelationshipType } from './requests'

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

export type DocumentFolderListItemResponse = {
  id: string
  projectId: string
  parentFolderId?: string | null
  name: string
  description?: string | null
  isActive: boolean
}

export type DocumentFolderDetailsResponse = {
  id: string
  tenantId: string
  projectId: string
  parentFolderId?: string | null
  name: string
  description?: string | null
  isActive: boolean
}

export type ProjectDocumentListItemResponse = {
  id: string
  projectId: string
  documentFolderId?: string | null
  documentNumber: string
  title: string
  fileName: string
  contentType: string
  fileSizeBytes: number
  currentVersionNumber: number
  status: ManagedDocumentStatus
  tags?: string | null
  isActive: boolean
}

export type ProjectDocumentDetailsResponse = {
  id: string
  tenantId: string
  projectId: string
  documentFolderId?: string | null
  documentNumber: string
  title: string
  fileName: string
  contentType: string
  fileSizeBytes: number
  currentVersionNumber: number
  status: ManagedDocumentStatus
  tags?: string | null
  notes?: string | null
  isActive: boolean
}

export type ProjectDocumentVersionListItemResponse = {
  id: string
  projectDocumentId: string
  versionNumber: number
  fileName: string
  contentType: string
  fileSizeBytes: number
  checksum?: string | null
  uploadedByUserId?: string | null
  uploadedAtUtc: string
  notes?: string | null
  isActive: boolean
}

export type ProjectDocumentUploadResponse = {
  id: string
  documentNumber: string
  title: string
  fileName: string
  fileSizeBytes: number
  currentVersionNumber: number
}

export type ProjectDocumentDownloadResponse = {
  downloadUrl: string
  fileName: string
  contentType: string
  fileSizeBytes: number
}

export type ProjectAssignmentListItemResponse = {
  id: string
  projectId: string
  employeeId?: string | null
  consultantId?: string | null
  assigneeType: string
  assigneeDisplayName: string
  roleTitle: string
  startDate: string
  endDate?: string | null
  isPrimaryAssignment: boolean
  notes?: string | null
  isActive: boolean
  createdAtUtc: string
  updatedAtUtc?: string | null
}

export type ProjectAssignmentDetailsResponse = {
  id: string
  tenantId: string
  projectId: string
  employeeId?: string | null
  consultantId?: string | null
  assigneeType: string
  assigneeDisplayName: string
  roleTitle: string
  startDate: string
  endDate?: string | null
  isPrimaryAssignment: boolean
  notes?: string | null
  isActive: boolean
  createdAtUtc: string
  updatedAtUtc?: string | null
}

export type ProjectAssignmentHistoryItemResponse = {
  auditLogId: string
  eventType: string
  description?: string | null
  actorUserId?: string | null
  createdAtUtc: string
  metadataJson?: string | null
}

export type EmployeeListItemResponse = {
  id: string
  companyId: string
  departmentId?: string | null
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  isActive: boolean
}

export type EmployeeDetailsResponse = {
  id: string
  tenantId: string
  companyId: string
  departmentId?: string | null
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  jobTitle: string
  hireDate: string
  isActive: boolean
}

export type ConsultantListItemResponse = {
  id: string
  consultantNumber: string
  fullName: string
  email: string
  phoneNumber?: string | null
  organizationName?: string | null
  specialty?: string | null
  isActive: boolean
}

export type ProjectAssignableConsultantListItemResponse = {
  id: string
  tenantId: string
  tenantCode: string
  tenantName: string
  consultantNumber: string
  fullName: string
  organizationName?: string | null
  isExternal: boolean
  isActive: boolean
}

export type ConsultantDetailsResponse = {
  id: string
  tenantId: string
  consultantNumber: string
  fullName: string
  email: string
  phoneNumber?: string | null
  organizationName?: string | null
  specialty?: string | null
  isActive: boolean
}
