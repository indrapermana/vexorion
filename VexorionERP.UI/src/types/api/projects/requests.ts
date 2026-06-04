export type ProjectLifecycleStatus = 1 | 2 | 3 | 4 | 5 | 6
export type ManagedDocumentStatus = 1 | 2 | 3 | 4 | 5 | 6

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

export type CreateDocumentFolderRequest = {
  projectId: string
  parentFolderId?: string | null
  name: string
  description?: string | null
}

export type UpdateDocumentFolderRequest = {
  name: string
  description?: string | null
}

export type UpdateProjectDocumentRequest = {
  title: string
  documentFolderId?: string | null
  tags?: string | null
  notes?: string | null
}

export type ChangeProjectDocumentStatusRequest = {
  newStatus: ManagedDocumentStatus
  reason?: string | null
}

export type CreateProjectAssignmentRequest = {
  employeeId?: string | null
  consultantId?: string | null
  roleTitle: string
  startDate: string
  endDate?: string | null
  isPrimaryAssignment: boolean
  notes?: string | null
}

export type UpdateProjectAssignmentRequest = CreateProjectAssignmentRequest & {
  isActive: boolean
}

export type CreateEmployeeRequest = {
  companyId: string
  departmentId?: string | null
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  jobTitle: string
  hireDate: string
}

export type UpdateEmployeeRequest = CreateEmployeeRequest & {
  isActive: boolean
}

export type CreateConsultantRequest = {
  consultantNumber: string
  fullName: string
  email: string
  phoneNumber?: string | null
  organizationName?: string | null
  specialty?: string | null
}

export type UpdateConsultantRequest = CreateConsultantRequest & {
  isActive: boolean
}
