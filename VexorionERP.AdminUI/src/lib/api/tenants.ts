import { requestJson } from './core'
import type {
  TenantListItemResponse,
  TenantPreferencesResponse,
  TenantTelemetryResponse,
  UpdateTenantRequest,
} from '../../types/api'

export function getTenants() {
  return requestJson<TenantListItemResponse[]>('/tenants')
}

export function updateTenant(tenantId: string, request: UpdateTenantRequest) {
  return requestJson<TenantListItemResponse>(`/tenants/${tenantId}`, 'PUT', request)
}

export function deleteTenant(tenantId: string) {
  return requestJson<void>(`/tenants/${tenantId}`, 'DELETE')
}

export function getTenantMenuConfiguration(tenantId: string) {
  return requestJson<TenantPreferencesResponse>(`/tenants/${tenantId}/preferences/menu`)
}

export function updateTenantMenuConfiguration(tenantId: string, hiddenMenuLinks: string[]) {
  return requestJson<TenantPreferencesResponse>(`/tenants/${tenantId}/preferences/menu`, 'PUT', { hiddenMenuLinks })
}

export function getTenantTelemetry(rangeDays?: 7 | 30) {
  const params = new URLSearchParams()
  if (rangeDays) {
    params.set('rangeDays', String(rangeDays))
  }

  const query = params.toString()
  return requestJson<TenantTelemetryResponse>(query.length > 0 ? `/tenants/telemetry?${query}` : '/tenants/telemetry')
}
