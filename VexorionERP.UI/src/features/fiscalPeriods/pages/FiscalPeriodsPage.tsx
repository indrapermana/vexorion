import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxConfirmActionDialog, VxStack } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState } from '../../../components/PagePrimitives'
import { ApiError, closeFiscalPeriod, getFiscalPeriods, reopenFiscalPeriod } from '../../../lib/api'
import type { FiscalPeriodDetailsResponse, FiscalPeriodListItemResponse } from '../../../types/api'

const FiscalPeriodDataGrid = lazy(() => import('../components/FiscalPeriodDataGrid'))
const FiscalPeriodEditorDialog = lazy(() => import('../components/FiscalPeriodEditorDialog'))

function FiscalPeriodSurfaceFallback() {
  const { t } = useTranslation()
  return <PageLoadingState label={t('common.labels.loading')} />
}

export default function FiscalPeriodsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.billing.manage) ?? false
  const [rows, setRows] = useState<FiscalPeriodListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<FiscalPeriodListItemResponse | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setRows(await getFiscalPeriods())
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load fiscal periods.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openCreate = () => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    setSelectedId(null)
    setIsEditorOpen(true)
  }

  const openEdit = (fiscalPeriodId: string) => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('edit')
    setSelectedId(fiscalPeriodId)
    setIsEditorOpen(true)
  }

  const handleSaved = async (period: FiscalPeriodDetailsResponse, mode: 'create' | 'edit') => {
    setFeedback(mode === 'create' ? `Fiscal period ${period.periodCode} created.` : `Fiscal period ${period.periodCode} updated.`)
    setIsEditorOpen(false)
    setSelectedId(null)
    await loadData()
  }

  const handleClosePeriod = async (row: FiscalPeriodListItemResponse) => {
    if (!canManage) return
    setFeedback(null)
    setError(null)
    setIsClosing(true)
    try {
      const period = await closeFiscalPeriod(row.id)
      setFeedback(`Fiscal period ${period.periodCode} closed.`)
      setCloseTarget(null)
      await loadData()
    } catch (closeError) {
      if (closeError instanceof ApiError) setError(closeError.message)
      else setError('Unable to close fiscal period.')
    } finally {
      setIsClosing(false)
    }
  }

  const handleReopenPeriod = async (row: FiscalPeriodListItemResponse) => {
    if (!canManage) return
    setFeedback(null)
    setError(null)
    try {
      const period = await reopenFiscalPeriod(row.id)
      setFeedback(`Fiscal period ${period.periodCode} reopened.`)
      await loadData()
    } catch (reopenError) {
      if (reopenError instanceof ApiError) setError(reopenError.message)
      else setError('Unable to reopen fiscal period.')
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.fiscalPeriods.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.fiscalPeriods')}
        description={t('pages.fiscalPeriods.description')}
        primaryAction={canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>{t('pages.fiscalPeriods.newButton')}</VxButton> : null}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.billing.manage} /> : null}

      <PageBody>
        <Suspense fallback={<FiscalPeriodSurfaceFallback />}>
          <FiscalPeriodDataGrid
            rows={rows}
            isLoading={isLoading}
            onEdit={openEdit}
            onClosePeriod={setCloseTarget}
            onReopenPeriod={(row) => void handleReopenPeriod(row)}
            canManage={canManage}
          />
        </Suspense>
      </PageBody>

      {canManage && isEditorOpen ? (
        <Suspense fallback={<FiscalPeriodSurfaceFallback />}>
          <FiscalPeriodEditorDialog open={isEditorOpen} mode={editorMode} fiscalPeriodId={selectedId} onClose={() => setIsEditorOpen(false)} onSaved={(period, mode) => void handleSaved(period, mode)} />
        </Suspense>
      ) : null}

      <VxConfirmActionDialog
        open={canManage && Boolean(closeTarget)}
        title={t('pages.fiscalPeriods.closeDialog.title')}
        targetName={closeTarget?.periodCode ?? ''}
        consequence={t('pages.fiscalPeriods.closeDialog.consequence')}
        confirmLabel={t('pages.fiscalPeriods.closeDialog.confirm')}
        confirmColor="warning"
        pendingLabel={t('pages.fiscalPeriods.closeDialog.pending')}
        pending={isClosing}
        onClose={() => setCloseTarget(null)}
        onConfirm={() => { if (closeTarget) void handleClosePeriod(closeTarget) }}
      />
    </VxStack>
  )
}
