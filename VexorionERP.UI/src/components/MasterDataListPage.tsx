import type { ReactNode } from 'react'
import { VxStack } from '@vexorion/ui'
import PermissionReadOnlyAlert from './PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader } from './PagePrimitives'

type MasterDataListPageProps = {
  title: ReactNode
  description?: ReactNode
  primaryAction?: ReactNode
  filters?: ReactNode
  metrics?: ReactNode
  error?: ReactNode
  success?: ReactNode
  info?: ReactNode
  onRetry?: () => void
  canManage: boolean
  requiredPermission: string
  children: ReactNode
}

export default function MasterDataListPage({
  title,
  description,
  primaryAction,
  filters,
  metrics,
  error,
  success,
  info,
  onRetry,
  canManage,
  requiredPermission,
  children,
}: MasterDataListPageProps) {
  return (
    <VxStack spacing={3}>
      <PageHeader title={title} description={description} primaryAction={primaryAction} filters={filters} metrics={metrics} />
      <PageFeedback error={error} success={success} info={info} onRetry={onRetry} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={requiredPermission} /> : null}
      <PageBody>{children}</PageBody>
    </VxStack>
  )
}