export type AuditLogListItemResponse = {
  id: string
  createdAtUtc: string
  eventType: string
  actorUserId?: string
  targetUserId?: string
  entityName?: string
  entityId?: string
  description?: string
  metadataJson?: string
  ipAddress?: string
  userAgent?: string
}

export type AuditLogListResponse = {
  page: number
  pageSize: number
  totalCount: number
  items: AuditLogListItemResponse[]
}
