import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, Groups2RoundedIcon, MailOutlineRoundedIcon, MonetizationOnRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxStack } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteCustomer, getCustomers } from '../../../lib/api'
import type { CustomerDetailsResponse, CustomerListItemResponse } from '../../../types/api'
import type { CustomerDialogMode } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'

const CustomerEditorDialog = lazy(() => import('../components/CustomerEditorDialog'))
const CustomerDataGrid = lazy(() => import('../components/CustomerDataGrid'))
const CustomerDeleteDialog = lazy(() => import('../components/CustomerDeleteDialog'))

function CustomerSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.customers.loadingTools')} />
  )
}

export default function CustomersPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.customers.manage) ?? false
  const [customers, setCustomers] = useState<CustomerListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<CustomerDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated) {
      setCustomers([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getCustomers()
      setCustomers(result)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load customers.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedCustomerId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (customerId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedCustomerId(customerId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedCustomerId(null)
  }

  const handleSaved = async (customer: CustomerDetailsResponse, mode: CustomerDialogMode) => {
    setFeedback(mode === 'create' ? `Customer ${customer.name} created.` : `Customer ${customer.name} updated.`)
    handleEditorClose()
    await loadCustomers()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteCustomer(deleteTarget.id)
      setFeedback(`Customer ${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
      await loadCustomers()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete customer.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <VxAlert severity="info">{t('pages.customers.signInRequired')}</VxAlert>
    )
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.customers')}
        description={t('pages.customers.description')}
        primaryAction={canManage ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
            {t('pages.customers.newButton')}
          </VxButton>
        ) : null}
        metrics={(
          <>
            <PageMetric icon={<Groups2RoundedIcon fontSize="small" />} label={t('pages.customers.metrics.rows')} value={customers.length} />
            <PageMetric icon={<MailOutlineRoundedIcon fontSize="small" />} label={t('pages.common.withEmail')} value={customers.filter((customer) => Boolean(customer.email)).length} />
            <PageMetric icon={<MonetizationOnRoundedIcon fontSize="small" />} label={t('pages.customers.metrics.active')} value={customers.filter((customer) => customer.isActive).length} />
          </>
        )}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadCustomers() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.customers.manage} /> : null}

      <PageBody>
        <Suspense fallback={<CustomerSurfaceFallback />}>
          <CustomerDataGrid
            rows={customers}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
            canManage={canManage}
          />
        </Suspense>
      </PageBody>

      {canManage && isEditorOpen ? (
        <Suspense fallback={<CustomerSurfaceFallback />}>
          <CustomerEditorDialog
            key={`${dialogMode}:${selectedCustomerId ?? 'new'}`}
            open={isEditorOpen}
            mode={dialogMode}
            customerId={selectedCustomerId}
            onClose={handleEditorClose}
            onSaved={(customer, mode) => void handleSaved(customer, mode)}
          />
        </Suspense>
      ) : null}

      {canManage && deleteTarget ? (
        <Suspense fallback={null}>
          <CustomerDeleteDialog
            target={deleteTarget}
            isDeleting={isDeleting}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => void handleDelete()}
          />
        </Suspense>
      ) : null}
    </VxStack>
  )
}
