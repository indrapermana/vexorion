import type { AuditLogListResponse } from '../../types/api'
import { requestJson } from './core'

export type AuditLogQuery = {
  eventType?: string
  entityName?: string
  fromUtc?: string
  toUtc?: string
  page?: number
  pageSize?: number
}

export function getAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams()
  if (query.eventType) params.set('eventType', query.eventType)
  if (query.entityName) params.set('entityName', query.entityName)
  if (query.fromUtc) params.set('fromUtc', query.fromUtc)
  if (query.toUtc) params.set('toUtc', query.toUtc)
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 50))

  return requestJson<AuditLogListResponse>(`/audit-logs?${params.toString()}`)
}
