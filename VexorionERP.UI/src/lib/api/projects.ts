import type {
  CreateProjectCategoryRequest,
  CreateProjectPartyRequest,
  CreateProjectRequest,
  ProjectCategoryDetailsResponse,
  ProjectCategoryListItemResponse,
  ProjectDetailsResponse,
  ProjectListFilterRequest,
  ProjectListItemResponse,
  ProjectPartyDetailsResponse,
  ProjectPartyListItemResponse,
  ProjectTimelineItemResponse,
  UpdateProjectCategoryRequest,
  UpdateProjectPartyRequest,
  UpdateProjectRequest,
} from '../../types/api'
import { requestJson } from './core'

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
