import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, CheckCircleRoundedIcon, PlaceRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteWarehouse, getWarehouses } from '../../../lib/api'
import type { WarehouseDetailsResponse, WarehouseListItemResponse } from '../../../types/api'
import type { WarehouseDialogMode } from '../../../types/ui'

const WarehouseEditorDialog = lazy(() => import('../components/WarehouseEditorDialog'))
const WarehouseDataGrid = lazy(() => import('../components/WarehouseDataGrid'))
const WarehouseDeleteDialog = lazy(() => import('../components/WarehouseDeleteDialog'))

function WarehouseSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.warehouses.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

export default function WarehousesPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
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
    return <Alert severity="info">{t('pages.warehouses.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.warehouses')}</Typography>
            <Typography color="text.secondary">{t('pages.warehouses.description')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>{t('pages.warehouses.newButton')}</Button>
            <Paper elevation={0} className="products-metric-card"><WarehouseRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.warehouses.metrics.rows')}</Typography><Typography variant="h6">{warehouses.length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><CheckCircleRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.warehouses.metrics.activeLocations')}</Typography><Typography variant="h6">{warehouses.filter((warehouse) => warehouse.isActive).length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><PlaceRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.warehouses.metrics.codesReady')}</Typography><Typography variant="h6">{warehouses.filter((warehouse) => warehouse.code.length > 0).length}</Typography></Box></Paper>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {highlightedWarehouseId ? <Alert severity="info">{t('pages.warehouses.focusedMovedTop')}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<WarehouseSurfaceFallback />}>
          <WarehouseDataGrid rows={visibleWarehouses} isLoading={isLoading} highlightedWarehouseId={highlightedWarehouseId} onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<WarehouseSurfaceFallback />}>
          <WarehouseEditorDialog key={`${dialogMode}:${selectedWarehouseId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} warehouseId={selectedWarehouseId} onClose={handleEditorClose} onSaved={(warehouse, mode) => void handleSaved(warehouse, mode)} />
        </Suspense>
      ) : null}

      {deleteTarget ? (
        <Suspense fallback={null}>
          <WarehouseDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
        </Suspense>
      ) : null}
    </Stack>
  )
}