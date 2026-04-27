import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded'
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteSupplier, getSuppliers } from '../../../lib/api'
import type { SupplierDetailsResponse, SupplierListItemResponse } from '../../../types/api'
import type { SupplierDialogMode } from '../../../types/ui'

const SupplierEditorDialog = lazy(() => import('../components/SupplierEditorDialog'))
const SupplierDataGrid = lazy(() => import('../components/SupplierDataGrid'))
const SupplierDeleteDialog = lazy(() => import('../components/SupplierDeleteDialog'))

function SupplierSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.suppliers.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [suppliers, setSuppliers] = useState<SupplierListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<SupplierDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupplierListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSuppliers = useCallback(async () => {
    if (!isAuthenticated) {
      setSuppliers([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setSuppliers(await getSuppliers())
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load suppliers.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadSuppliers()
  }, [loadSuppliers])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedSupplierId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (supplierId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedSupplierId(supplierId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedSupplierId(null)
  }

  const handleSaved = async (supplier: SupplierDetailsResponse, mode: SupplierDialogMode) => {
    setFeedback(mode === 'create' ? `Supplier ${supplier.name} created.` : `Supplier ${supplier.name} updated.`)
    handleEditorClose()
    await loadSuppliers()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteSupplier(deleteTarget.id)
      setFeedback(`Supplier ${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
      await loadSuppliers()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete supplier.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">{t('pages.suppliers.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.suppliers')}</Typography>
            <Typography color="text.secondary">{t('pages.suppliers.description')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>{t('pages.suppliers.newButton')}</Button>
            <Paper elevation={0} className="products-metric-card"><Groups2RoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.suppliers.metrics.rows')}</Typography><Typography variant="h6">{suppliers.length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><MailOutlineRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.common.withEmail')}</Typography><Typography variant="h6">{suppliers.filter((supplier) => Boolean(supplier.email)).length}</Typography></Box></Paper>
            <Paper elevation={0} className="products-metric-card"><LocalAtmRoundedIcon fontSize="small" /><Box><Typography variant="body2" color="text.secondary">{t('pages.suppliers.metrics.active')}</Typography><Typography variant="h6">{suppliers.filter((supplier) => supplier.isActive).length}</Typography></Box></Paper>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<SupplierSurfaceFallback />}>
          <SupplierDataGrid rows={suppliers} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<SupplierSurfaceFallback />}>
          <SupplierEditorDialog key={`${dialogMode}:${selectedSupplierId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} supplierId={selectedSupplierId} onClose={handleEditorClose} onSaved={(supplier, mode) => void handleSaved(supplier, mode)} />
        </Suspense>
      ) : null}

      {deleteTarget ? (
        <Suspense fallback={null}>
          <SupplierDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
        </Suspense>
      ) : null}
    </Stack>
  )
}