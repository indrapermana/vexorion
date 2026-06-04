import type {
  ActivateTenantRelationshipRequest,
  CreateTenantRelationshipRequest,
  OnboardTenantRequest,
  OnboardTenantResponse,
  TenantModuleConfigResponse,
  StorageTopConsumersResponse,
  StorageUsageSummaryResponse,
  TenantRelationshipDetailsResponse,
  TenantRelationshipListItemResponse,
  UpdateTenantRelationshipRequest,
} from '../../types/api'
import { requestJson } from './core'

export function onboardTenant(request: OnboardTenantRequest) {
  return requestJson<OnboardTenantResponse>('/tenants/onboard', 'POST', request)
}

export function getTenantRelationships() {
  return requestJson<TenantRelationshipListItemResponse[]>('/tenant-relationships')
}

export function getActiveTenantRelationships() {
  return requestJson<TenantRelationshipListItemResponse[]>('/tenant-relationships/active')
}

export function getTenantRelationship(relationshipId: string) {
  return requestJson<TenantRelationshipDetailsResponse>(`/tenant-relationships/${relationshipId}`)
}

export function createTenantRelationship(request: CreateTenantRelationshipRequest) {
  return requestJson<TenantRelationshipDetailsResponse>('/tenant-relationships', 'POST', request)
}

export function updateTenantRelationship(relationshipId: string, request: UpdateTenantRelationshipRequest) {
  return requestJson<TenantRelationshipDetailsResponse>(`/tenant-relationships/${relationshipId}`, 'PUT', request)
}

export function activateTenantRelationship(relationshipId: string, request: ActivateTenantRelationshipRequest) {
  return requestJson<TenantRelationshipDetailsResponse>(`/tenant-relationships/${relationshipId}/activate`, 'POST', request)
}

export function deleteTenantRelationship(relationshipId: string) {
  return requestJson<void>(`/tenant-relationships/${relationshipId}`, 'DELETE')
}

export function getTenantModuleConfig(tenantId: string) {
  return requestJson<TenantModuleConfigResponse>(`/tenants/${tenantId}/modules`)
}

export function getTenantStorageSummary(tenantId: string) {
  return requestJson<StorageUsageSummaryResponse>(`/tenants/${tenantId}/storage/summary`)
}

export function getTenantStorageTopConsumers(tenantId: string, take = 5) {
  return requestJson<StorageTopConsumersResponse>(`/tenants/${tenantId}/storage/top-consumers?take=${take}`)
}