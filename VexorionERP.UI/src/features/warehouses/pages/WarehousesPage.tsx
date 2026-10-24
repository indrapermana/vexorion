import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, CheckCircleRoundedIcon, PlaceRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteWarehouse, getWarehouses } from '../../../lib/api'
import type { WarehouseDetailsResponse, WarehouseListItemResponse } from '../../../types/api'
import type { WarehouseDialogMode } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import MasterDataListPage from '../../../components/MasterDataListPage'
import { PageLoadingState, PageMetric } from '../../../components/PagePrimitives'

const WarehouseEditorDialog = lazy(() => import('../components/WarehouseEditorDialog'))
const WarehouseDataGrid = lazy(() => import('../components/WarehouseDataGrid'))
const WarehouseDeleteDialog = lazy(() => import('../components/WarehouseDeleteDialog'))

function WarehouseSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.warehouses.loadingTools')} />
  )
}

export default function WarehousesPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.inventory.manage) ?? false
  const [searchParams] = useSearchParams()
  const [warehouses, setWarehouses] = useState<WarehouseListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<WarehouseDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WarehouseListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const highlightedWarehouseId = searchParams.get('warehouseId')
  const visibleWarehouses = useMemo(() => {
    if (!highlightedWarehouseId) {
      return warehouses
    }

    return [...warehouses].sort((left, right) => {
      if (left.id === highlightedWarehouseId) {
        return -1
      }

      if (right.id === highlightedWarehouseId) {
        return 1
      }

      return left.name.localeCompare(right.name)
    })
  }, [highlightedWarehouseId, warehouses])

  const loadWarehouses = useCallback(async () => {
    if (!isAuthenticated) {
      setWarehouses([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setWarehouses(await getWarehouses())
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load warehouses.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadWarehouses()
  }, [loadWarehouses])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedWarehouseId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (warehouseId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedWarehouseId(warehouseId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedWarehouseId(null)
  }

  const handleSaved = async (warehouse: WarehouseDetailsResponse, mode: WarehouseDialogMode) => {
    setFeedback(mode === 'create' ? `Warehouse ${warehouse.name} created.` : `Warehouse ${warehouse.name} updated.`)
    handleEditorClose()
    await loadWarehouses()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteWarehouse(deleteTarget.id)
      setFeedback(`Warehouse ${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
      await loadWarehouses()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete warehouse.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.warehouses.signInRequired')}</VxAlert>
  }

  return (
    <>
    <MasterDataListPage
        title={t('nav.routeTitles.warehouses')}
        description={t('pages.warehouses.description')}
        primaryAction={canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>{t('pages.warehouses.newButton')}</VxButton> : null}
        metrics={(
          <>
            <PageMetric icon={<WarehouseRoundedIcon fontSize="small" />} label={t('pages.warehouses.metrics.rows')} value={warehouses.length} />
            <PageMetric icon={<CheckCircleRoundedIcon fontSize="small" />} label={t('pages.warehouses.metrics.activeLocations')} value={warehouses.filter((warehouse) => warehouse.isActive).length} />
            <PageMetric icon={<PlaceRoundedIcon fontSize="small" />} label={t('pages.warehouses.metrics.codesReady')} value={warehouses.filter((warehouse) => warehouse.code.length > 0).length} />
          </>
        )}
        error={error}
        success={feedback}
        info={highlightedWarehouseId ? t('pages.warehouses.focusedMovedTop') : null}
        onRetry={error ? () => void loadWarehouses() : undefined}
        canManage={canManage}
        requiredPermission={Permissions.inventory.manage}
    >
      <Suspense fallback={<WarehouseSurfaceFallback />}>
        <WarehouseDataGrid rows={visibleWarehouses} isLoading={isLoading} highlightedWarehouseId={highlightedWarehouseId} onEdit={openEditDialog} onDelete={setDeleteTarget} canManage={canManage} />
      </Suspense>
    </MasterDataListPage>

    {canManage && isEditorOpen ? (
        <Suspense fallback={<WarehouseSurfaceFallback />}>
          <WarehouseEditorDialog key={`${dialogMode}:${selectedWarehouseId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} warehouseId={selectedWarehouseId} onClose={handleEditorClose} onSaved={(warehouse, mode) => void handleSaved(warehouse, mode)} />
        </Suspense>
      ) : null}

    {canManage && deleteTarget ? (
        <Suspense fallback={null}>
          <WarehouseDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
        </Suspense>
      ) : null}
    </>
  )
}
