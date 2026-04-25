import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteWarehouse, getWarehouses } from '../../../lib/api'
import type { WarehouseDetailsResponse, WarehouseListItemResponse } from '../../../types/api'
import type { WarehouseDialogMode } from '../../../types/ui'

const WarehouseEditorDialog = lazy(() => import('../components/WarehouseEditorDialog'))
const WarehouseDataGrid = lazy(() => import('../components/WarehouseDataGrid'))
const WarehouseDeleteDialog = lazy(() => import('../components/WarehouseDeleteDialog'))

function WarehouseSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading warehouse tools...</Typography>
      </Stack>
    </Box>
  )
}

export default function WarehousesPage() {
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
    return <Alert severity="info">Sign in first. The warehouses API requires an authenticated user with inventory view permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Warehouses</Typography>
            <Typography color="text.secondary">Inventory locations from `/api/warehouses`, ready to support stock and fulfillment flows.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>New warehouse</Button>
            <Paper elevation={0} className="products-metric-card"><WarehouseRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">Warehouse rows</Typography><Typography variant="h6">{warehouses.length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><CheckCircleRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">Active locations</Typography><Typography variant="h6">{warehouses.filter((warehouse) => warehouse.isActive).length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><PlaceRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">Codes ready</Typography><Typography variant="h6">{warehouses.filter((warehouse) => warehouse.code.length > 0).length}</Typography></Box></Paper>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {highlightedWarehouseId ? <Alert severity="info">Focused warehouse moved to the top of the list.</Alert> : null}
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