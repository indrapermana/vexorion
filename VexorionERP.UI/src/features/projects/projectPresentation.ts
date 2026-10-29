import type { ProjectLifecycleStatus, TenantRelationshipType } from '../../types/api'

export function getProjectStatusLabelKey(status: ProjectLifecycleStatus): string {
  switch (status) {
    case 1: return 'common.statusLabels.draft'
    case 2: return 'common.statusLabels.inReview'
    case 3: return 'common.statusLabels.submitted'
    case 4: return 'common.statusLabels.awarded'
    case 5: return 'common.statusLabels.completed'
    case 6: return 'common.statusLabels.cancelled'
    default: return 'common.statusLabels.draft'
  }
}

export function getRelationshipTypeLabelKey(type: TenantRelationshipType): string {
  switch (type) {
    case 1: return 'common.relationshipTypes.primeContractor'
    case 2: return 'common.relationshipTypes.subcontractor'
    case 3: return 'common.relationshipTypes.legalSponsor'
    case 4: return 'common.relationshipTypes.deliveryPartner'
    case 5: return 'common.relationshipTypes.customer'
    case 6: return 'common.relationshipTypes.vendor'
    case 7: return 'common.relationshipTypes.consortiumMember'
    default: return 'common.relationshipTypes.subcontractor'
  }
}
