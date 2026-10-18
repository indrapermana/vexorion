import type {
  ChangeProjectDocumentStatusRequest,
  ConsultantDetailsResponse,
  ConsultantListItemResponse,
  CreateConsultantRequest,
  CreateDocumentFolderRequest,
  CreateEmployeeRequest,
  CreateProjectAssignmentRequest,
  CreateProjectCategoryRequest,
  CreateProjectPartyRequest,
  CreateProjectRequest,
  DocumentFolderDetailsResponse,
  DocumentFolderListItemResponse,
  EmployeeDetailsResponse,
  EmployeeListItemResponse,
  ManagedDocumentStatus,
  ProjectDocumentDetailsResponse,
  ProjectDocumentDownloadResponse,
  ProjectDocumentListItemResponse,
  ProjectDocumentUploadResponse,
  ProjectDocumentSearchFilterRequest,
  ProjectDocumentSearchItemResponse,
  ProjectDocumentVersionListItemResponse,
  ProjectCategoryDetailsResponse,
  ProjectCategoryListItemResponse,
  ProjectAssignmentDetailsResponse,
  ProjectAssignmentHistoryItemResponse,
  ProjectAssignmentListItemResponse,
  ProjectAssignableConsultantListItemResponse,
  ProjectDetailsResponse,
  ProjectListFilterRequest,
  ProjectListItemResponse,
  ProjectPartyDetailsResponse,
  ProjectPartyListItemResponse,
  ProjectTimelineItemResponse,
  UpdateDocumentFolderRequest,
  UpdateConsultantRequest,
  UpdateEmployeeRequest,
  UpdateProjectAssignmentRequest,
  UpdateProjectCategoryRequest,
  UpdateProjectDocumentRequest,
  UpdateProjectPartyRequest,
  UpdateProjectRequest,
} from '../../types/api'
import { apiClient, requestJson, toApiError } from './core'

export function getProjectCategories() {
  return requestJson<ProjectCategoryListItemResponse[]>('/project-categories')
}

export function getProjectCategory(categoryId: string) {
  return requestJson<ProjectCategoryDetailsResponse>(`/project-categories/${categoryId}`)
}

export function createProjectCategory(request: CreateProjectCategoryRequest) {
  return requestJson<ProjectCategoryDetailsResponse>('/project-categories', 'POST', request)
}

export function updateProjectCategory(categoryId: string, request: UpdateProjectCategoryRequest) {
  return requestJson<ProjectCategoryDetailsResponse>(`/project-categories/${categoryId}`, 'PUT', request)
}

export function deleteProjectCategory(categoryId: string) {
  return requestJson<void>(`/project-categories/${categoryId}`, 'DELETE')
}

export function getProjects(filter: ProjectListFilterRequest = {}) {
  const params = new URLSearchParams()
  if (typeof filter.status === 'number') {
    params.set('status', String(filter.status))
  }

  if (filter.relatedTenantId && filter.relatedTenantId.trim().length > 0) {
    params.set('relatedTenantId', filter.relatedTenantId.trim())
  }

  const query = params.toString()
  return requestJson<ProjectListItemResponse[]>(query ? `/projects?${query}` : '/projects')
}

export function getProject(projectId: string) {
  return requestJson<ProjectDetailsResponse>(`/projects/${projectId}`)
}

export function createProject(request: CreateProjectRequest) {
  return requestJson<ProjectDetailsResponse>('/projects', 'POST', request)
}

export function updateProject(projectId: string, request: UpdateProjectRequest) {
  return requestJson<ProjectDetailsResponse>(`/projects/${projectId}`, 'PUT', request)
}

export function deleteProject(projectId: string) {
  return requestJson<void>(`/projects/${projectId}`, 'DELETE')
}

export function getProjectTimeline(projectId: string) {
  return requestJson<ProjectTimelineItemResponse[]>(`/projects/${projectId}/timeline`)
}

export function getProjectParties(projectId: string) {
  return requestJson<ProjectPartyListItemResponse[]>(`/projects/${projectId}/parties`)
}

export function getProjectParty(projectId: string, projectPartyId: string) {
  return requestJson<ProjectPartyDetailsResponse>(`/projects/${projectId}/parties/${projectPartyId}`)
}

export function createProjectParty(projectId: string, request: CreateProjectPartyRequest) {
  return requestJson<ProjectPartyDetailsResponse>(`/projects/${projectId}/parties`, 'POST', request)
}

export function updateProjectParty(projectId: string, projectPartyId: string, request: UpdateProjectPartyRequest) {
  return requestJson<ProjectPartyDetailsResponse>(`/projects/${projectId}/parties/${projectPartyId}`, 'PUT', request)
}

export function deleteProjectParty(projectId: string, projectPartyId: string) {
  return requestJson<void>(`/projects/${projectId}/parties/${projectPartyId}`, 'DELETE')
}

export function getProjectAssignments(projectId: string) {
  return requestJson<ProjectAssignmentListItemResponse[]>(`/projects/${projectId}/assignments`)
}

export function getProjectAssignment(projectId: string, assignmentId: string) {
  return requestJson<ProjectAssignmentDetailsResponse>(`/projects/${projectId}/assignments/${assignmentId}`)
}

export function getProjectAssignmentHistory(projectId: string) {
  return requestJson<ProjectAssignmentHistoryItemResponse[]>(`/projects/${projectId}/assignments/history`)
}

export function getProjectAssignableEmployees(projectId: string) {
  return requestJson<EmployeeListItemResponse[]>(`/projects/${projectId}/assignments/available-employees`)
}

export function getProjectAssignableConsultants(projectId: string) {
  return requestJson<ProjectAssignableConsultantListItemResponse[]>(`/projects/${projectId}/assignments/available-consultants`)
}

export function createProjectAssignment(projectId: string, request: CreateProjectAssignmentRequest) {
  return requestJson<ProjectAssignmentDetailsResponse>(`/projects/${projectId}/assignments`, 'POST', request)
}

export function updateProjectAssignment(projectId: string, assignmentId: string, request: UpdateProjectAssignmentRequest) {
  return requestJson<ProjectAssignmentDetailsResponse>(`/projects/${projectId}/assignments/${assignmentId}`, 'PUT', request)
}

export function deleteProjectAssignment(projectId: string, assignmentId: string) {
  return requestJson<void>(`/projects/${projectId}/assignments/${assignmentId}`, 'DELETE')
}

export function getEmployees() {
  return requestJson<EmployeeListItemResponse[]>('/employees')
}

export function getEmployee(employeeId: string) {
  return requestJson<EmployeeDetailsResponse>(`/employees/${employeeId}`)
}

export function createEmployee(request: CreateEmployeeRequest) {
  return requestJson<EmployeeDetailsResponse>('/employees', 'POST', request)
}

export function updateEmployee(employeeId: string, request: UpdateEmployeeRequest) {
  return requestJson<EmployeeDetailsResponse>(`/employees/${employeeId}`, 'PUT', request)
}

export function deleteEmployee(employeeId: string) {
  return requestJson<void>(`/employees/${employeeId}`, 'DELETE')
}

export function getConsultants() {
  return requestJson<ConsultantListItemResponse[]>('/consultants')
}

export function getConsultant(consultantId: string) {
  return requestJson<ConsultantDetailsResponse>(`/consultants/${consultantId}`)
}

export function createConsultant(request: CreateConsultantRequest) {
  return requestJson<ConsultantDetailsResponse>('/consultants', 'POST', request)
}

export function updateConsultant(consultantId: string, request: UpdateConsultantRequest) {
  return requestJson<ConsultantDetailsResponse>(`/consultants/${consultantId}`, 'PUT', request)
}

export function deleteConsultant(consultantId: string) {
  return requestJson<void>(`/consultants/${consultantId}`, 'DELETE')
}

export function getProjectDocumentFolders(projectId: string, parentFolderId?: string) {
  const query = parentFolderId ? `?parentFolderId=${encodeURIComponent(parentFolderId)}` : ''
  return requestJson<DocumentFolderListItemResponse[]>(`/projects/${projectId}/folders${query}`)
}

export function getProjectDocumentFolder(projectId: string, folderId: string) {
  return requestJson<DocumentFolderDetailsResponse>(`/projects/${projectId}/folders/${folderId}`)
}

export function createProjectDocumentFolder(projectId: string, request: Omit<CreateDocumentFolderRequest, 'projectId'>) {
  return requestJson<DocumentFolderDetailsResponse>(`/projects/${projectId}/folders`, 'POST', {
    ...request,
    projectId,
  })
}

export function updateProjectDocumentFolder(projectId: string, folderId: string, request: UpdateDocumentFolderRequest) {
  return requestJson<DocumentFolderDetailsResponse>(`/projects/${projectId}/folders/${folderId}`, 'PUT', request)
}

export function deleteProjectDocumentFolder(projectId: string, folderId: string) {
  return requestJson<void>(`/projects/${projectId}/folders/${folderId}`, 'DELETE')
}

export function getProjectDocuments(projectId: string, filter?: {
  documentFolderId?: string
  status?: ManagedDocumentStatus
  searchTerm?: string
}) {
  const params = new URLSearchParams()
  if (filter?.documentFolderId) params.set('documentFolderId', filter.documentFolderId)
  if (typeof filter?.status === 'number') params.set('status', String(filter.status))
  if (filter?.searchTerm && filter.searchTerm.trim().length > 0) params.set('searchTerm', filter.searchTerm.trim())

  const query = params.toString()
  return requestJson<ProjectDocumentListItemResponse[]>(query ? `/projects/${projectId}/documents?${query}` : `/projects/${projectId}/documents`)
}

export function getProjectDocument(projectId: string, documentId: string) {
  return requestJson<ProjectDocumentDetailsResponse>(`/projects/${projectId}/documents/${documentId}`)
}

export async function uploadProjectDocument(projectId: string, payload: {
  title: string
  documentFolderId?: string
  tags?: string
  notes?: string
  file: File
}) {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('file', payload.file)
  if (payload.documentFolderId) formData.append('documentFolderId', payload.documentFolderId)
  if (payload.tags) formData.append('tags', payload.tags)
  if (payload.notes) formData.append('notes', payload.notes)

  try {
    const response = await apiClient.post<ProjectDocumentUploadResponse>(`/projects/${projectId}/documents/upload`, formData)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export function updateProjectDocument(projectId: string, documentId: string, request: UpdateProjectDocumentRequest) {
  return requestJson<ProjectDocumentDetailsResponse>(`/projects/${projectId}/documents/${documentId}`, 'PUT', request)
}

export function deleteProjectDocument(projectId: string, documentId: string) {
  return requestJson<void>(`/projects/${projectId}/documents/${documentId}`, 'DELETE')
}

export function changeProjectDocumentStatus(projectId: string, documentId: string, request: ChangeProjectDocumentStatusRequest) {
  return requestJson<ProjectDocumentDetailsResponse>(`/projects/${projectId}/documents/${documentId}/status`, 'POST', request)
}

export function getProjectDocumentVersions(projectId: string, documentId: string) {
  return requestJson<ProjectDocumentVersionListItemResponse[]>(`/projects/${projectId}/documents/${documentId}/versions`)
}

export async function addProjectDocumentVersion(projectId: string, documentId: string, payload: { notes?: string; file: File }) {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.notes) formData.append('notes', payload.notes)

  try {
    const response = await apiClient.post<ProjectDocumentVersionListItemResponse>(`/projects/${projectId}/documents/${documentId}/versions`, formData)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export function getProjectDocumentDownload(projectId: string, documentId: string) {
  return requestJson<ProjectDocumentDownloadResponse>(`/projects/${projectId}/documents/${documentId}/download`)
}

export function searchProjectDocuments(filter: ProjectDocumentSearchFilterRequest = {}) {
  const params = new URLSearchParams()

  if (filter.projectId) params.set('projectId', filter.projectId)
  if (filter.projectCategoryId) params.set('projectCategoryId', filter.projectCategoryId)
  if (typeof filter.status === 'number') params.set('status', String(filter.status))
  if (filter.tag && filter.tag.trim().length > 0) params.set('tag', filter.tag.trim())
  if (filter.searchTerm && filter.searchTerm.trim().length > 0) params.set('searchTerm', filter.searchTerm.trim())
  if (filter.fromUtc && filter.fromUtc.trim().length > 0) params.set('fromUtc', filter.fromUtc.trim())
  if (filter.toUtc && filter.toUtc.trim().length > 0) params.set('toUtc', filter.toUtc.trim())

  const query = params.toString()
  return requestJson<ProjectDocumentSearchItemResponse[]>(query ? `/project-documents/search?${query}` : '/project-documents/search')
}
