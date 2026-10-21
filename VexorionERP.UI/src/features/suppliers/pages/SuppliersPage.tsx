import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, Groups2RoundedIcon, LocalAtmRoundedIcon, MailOutlineRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteSupplier, getSuppliers } from '../../../lib/api'
import type { SupplierDetailsResponse, SupplierListItemResponse } from '../../../types/api'
import type { SupplierDialogMode } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'

const SupplierEditorDialog = lazy(() => import('../components/SupplierEditorDialog'))
const SupplierDataGrid = lazy(() => import('../components/SupplierDataGrid'))
const SupplierDeleteDialog = lazy(() => import('../components/SupplierDeleteDialog'))

function SupplierSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxCircularProgress size={28} />
        <VxTypography color="text.secondary">{t('pages.suppliers.loadingTools')}</VxTypography>
      </VxStack>
    </VxBox>
  )
}

export default function SuppliersPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.suppliers.manage) ?? false
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
    return <VxAlert severity="info">{t('pages.suppliers.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.suppliers')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.suppliers.description')}</VxTypography>
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>{t('pages.suppliers.newButton')}</VxButton> : null}
            <VxPaper elevation={0} className="products-metric-card"><Groups2RoundedIcon fontSize="small" /><VxBox><VxTypography variant="body2" color="text.secondary">{t('pages.suppliers.metrics.rows')}</VxTypography><VxTypography variant="h6">{suppliers.length}</VxTypography></VxBox></VxPaper>
            <VxPaper elevation={0} className="products-metric-card"><MailOutlineRoundedIcon fontSize="small" /><VxBox><VxTypography variant="body2" color="text.secondary">{t('pages.common.withEmail')}</VxTypography><VxTypography variant="h6">{suppliers.filter((supplier) => Boolean(supplier.email)).length}</VxTypography></VxBox></VxPaper>
            <VxPaper elevation={0} className="products-metric-card"><LocalAtmRoundedIcon fontSize="small" /><VxBox><VxTypography variant="body2" color="text.secondary">{t('pages.suppliers.metrics.active')}</VxTypography><VxTypography variant="h6">{suppliers.filter((supplier) => supplier.isActive).length}</VxTypography></VxBox></VxPaper>
          </VxStack>
        </VxStack>
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.suppliers.manage} /> : null}

      <VxPaper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<SupplierSurfaceFallback />}>
          <SupplierDataGrid rows={suppliers} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} canManage={canManage} />
        </Suspense>
      </VxPaper>

      {canManage && isEditorOpen ? (
        <Suspense fallback={<SupplierSurfaceFallback />}>
          <SupplierEditorDialog key={`${dialogMode}:${selectedSupplierId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} supplierId={selectedSupplierId} onClose={handleEditorClose} onSaved={(supplier, mode) => void handleSaved(supplier, mode)} />
        </Suspense>
      ) : null}

      {canManage && deleteTarget ? (
        <Suspense fallback={null}>
          <SupplierDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
        </Suspense>
      ) : null}
    </VxStack>
  )
}
