import type { TenantRelationshipStatusValue, TenantRelationshipTypeValue } from './requests'

export type OnboardTenantResponse = {
  tenantId: string
  companyId: string
  adminUserId: string
  tenantCode: string
  adminUserName: string
}

export type TenantRelationshipListItemResponse = {
  id: string
  tenantId: string
  relatedTenantId: string
  relationshipType: TenantRelationshipTypeValue
  status: TenantRelationshipStatusValue
  effectiveFrom?: string | null
  effectiveTo?: string | null
  contractReference?: string | null
  scopeJson?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export type TenantRelationshipDetailsResponse = {
  id: string
  tenantId: string
  relatedTenantId: string
  relationshipType: TenantRelationshipTypeValue
  status: TenantRelationshipStatusValue
  effectiveFrom?: string | null
  effectiveTo?: string | null
  contractReference?: string | null
  scopeJson?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export type TenantModuleConfigResponse = {
  id: string
  tenantId: string
  projectManagementEnabled: boolean
  documentManagementEnabled: boolean
  employeeManagementEnabled: boolean
  salesEnabled: boolean
  purchasingEnabled: boolean
  inventoryEnabled: boolean
  updatedAtUtc?: string | null
}

export type StorageThresholdStatus = 'normal' | 'warning' | 'softBlock' | 'hardBlock' | number

export type StorageUsageSummaryResponse = {
  tenantId: string
  usedBytes: number
  reservedBytes: number
  maxStorageBytes: number
  usedPercent: number
  thresholdStatus: StorageThresholdStatus
  lastCalculatedAtUtc: string
  planCode?: string | null
  planName?: string | null
}

export type StorageTopProjectConsumerItem = {
  projectId: string
  projectName: string
  totalBytes: number
  documentCount: number
}

export type StorageTopDocumentConsumerItem = {
  projectDocumentId: string
  projectId: string
  title: string
  fileName: string
  fileSizeBytes: number
}

export type StorageTopConsumersResponse = {
  tenantId: string
  topProjects: StorageTopProjectConsumerItem[]
  topDocuments: StorageTopDocumentConsumerItem[]
}

