import type { ProjectLifecycleStatus, ProjectListItemResponse, TenantRelationshipType } from '../api'

export type ProjectDialogMode = 'create' | 'edit'
export type ProjectPartyDialogMode = 'create' | 'edit'

export type ProjectStatusFilterValue = 'all' | ProjectLifecycleStatus

export function getProjectLifecycleStatusLabel(status: ProjectLifecycleStatus) {
  if (status === 1) return 'Draft'
  if (status === 2) return 'In review'
  if (status === 3) return 'Submitted'
  if (status === 4) return 'Awarded'
  if (status === 5) return 'Completed'
  return 'Cancelled'
}

export function getTenantRelationshipTypeLabel(type: TenantRelationshipType) {
  if (type === 1) return 'Prime contractor'
  if (type === 2) return 'Subcontractor'
  if (type === 3) return 'Legal sponsor'
  if (type === 4) return 'Delivery partner'
  if (type === 5) return 'Customer'
  if (type === 6) return 'Vendor'
  return 'Consortium member'
}

export type ProjectGridRow = ProjectListItemResponse & {
  categoryLabel?: string
}
