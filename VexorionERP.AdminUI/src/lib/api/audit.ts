import { requestJson } from './core'
import type { AdminLifecycleAuditListResponse } from '../../types/api/audit'

export function getAdminLifecycleAudit(tenantId: string, targetUserId?: string) {
  const params = new URLSearchParams({ tenantId, page: '1', pageSize: '50' })
  if (targetUserId) params.set('targetUserId', targetUserId)
  return requestJson<AdminLifecycleAuditListResponse>(`/audit-logs/admin/lifecycle?${params.toString()}`)
}

export function getAdminTenantLifecycleAudit(tenantId: string) {
  const params = new URLSearchParams({ tenantId, tenantOnly: 'true', page: '1', pageSize: '20' })
  return requestJson<AdminLifecycleAuditListResponse>(`/audit-logs/admin/lifecycle?${params.toString()}`)
}
