import { requestJson } from './core'
import type { TenantListItemResponse, UpdateTenantRequest } from '../../types/api'

export function getTenants() {
  return requestJson<TenantListItemResponse[]>('/tenants')
}

export function updateTenant(tenantId: string, request: UpdateTenantRequest) {
  return requestJson<TenantListItemResponse>(`/tenants/${tenantId}`, 'PUT', request)
}
