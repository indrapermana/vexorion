export type AdminLifecycleAuditItemResponse = {
  id: string
  createdAtUtc: string
  eventType: string
  actorUserId?: string | null
  actorUserName?: string | null
  targetUserId?: string | null
  entityName?: string | null
  entityId?: string | null
  description?: string | null
  correlationId?: string | null
}

export type AdminLifecycleAuditListResponse = {
  page: number
  pageSize: number
  totalCount: number
  items: AdminLifecycleAuditItemResponse[]
}
