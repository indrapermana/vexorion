import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { DescriptionRoundedIcon, PaidRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { Box, CircularProgress, FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import DocumentsPanel from '../../../components/DocumentsPanel'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deletePurchaseInvoice, getPurchaseInvoiceLines, getPurchaseInvoices } from '../../../lib/api'
import { useSuppliersLookup } from '../../../hooks/useLookups'
import type { PurchaseInvoiceDetailsResponse, PurchaseInvoiceLineListItemResponse, PurchaseInvoiceListItemResponse } from '../../../types/api'
import type { PurchaseInvoiceDialogMode, PurchaseInvoiceFormValues, PurchaseInvoiceGridRow } from '../../../types/ui'

const PurchaseInvoiceEditorDialog = lazy(() => import('../components/PurchaseInvoiceEditorDialog'))
const PurchaseInvoiceDataGrid = lazy(() => import('../components/PurchaseInvoiceDataGrid'))
const PurchaseInvoiceDeleteDialog = lazy(() => import('../components/PurchaseInvoiceDeleteDialog'))
const PurchaseInvoiceLinesPanel = lazy(() => import('../components/PurchaseInvoiceLinesPanel'))

function PurchaseInvoiceSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.purchaseInvoices.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = Partial<PurchaseInvoiceFormValues> & { sourcePurchaseOrderId?: string | null }

export default function PurchaseInvoicesPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated } = useAuth()
  const { items: suppliers, error: suppliersError, reload: reloadSuppliers } = useSuppliersLookup(isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoiceListItemResponse[]>([])
  const [lines, setLines] = useState<PurchaseInvoiceLineListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linesLoading, setLinesLoading] = useState(false)
  const [outstandingOnly, setOutstandingOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linesError, setLinesError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<PurchaseInvoiceDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedPurchaseInvoiceId, setSelectedPurchaseInvoiceId] = useState<string | null>(null)
  const [editorDefaults, setEditorDefaults] = useState<Partial<PurchaseInvoiceFormValues> | undefined>(undefined)
  const [activeLinesInvoice, setActiveLinesInvoice] = useState<PurchaseInvoiceGridRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseInvoiceGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPurchaseInvoices = useCallback(async () => {
    if (!isAuthenticated) {
      setPurchaseInvoices([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setPurchaseInvoices(await getPurchaseInvoices(outstandingOnly))
      await reloadSuppliers()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load purchase invoices.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, outstandingOnly, reloadSuppliers])

  useEffect(() => {
    void loadPurchaseInvoices()
  }, [loadPurchaseInvoices])

  useEffect(() => {
    if (!sourceState?.sourcePurchaseOrderId) {
      return
    }

    setDialogMode('create')
    setSelectedPurchaseInvoiceId(null)
    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, navigate, sourceState])

  const loadLines = useCallback(async (invoiceId: string) => {
    setLinesLoading(true)
    setLinesError(null)
    try {
      setLines(await getPurchaseInvoiceLines(invoiceId))
    } catch (loadError) {
      if (loadError instanceof ApiError) setLinesError(loadError.message)
      else setLinesError('Unable to load purchase invoice lines.')
    } finally {
      setLinesLoading(false)
    }
  }, [])

  const supplierNameById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])), [suppliers])
  const rows = useMemo(() => purchaseInvoices.map((purchaseInvoice) => ({ ...purchaseInvoice, supplierName: supplierNameById.get(purchaseInvoice.supplierId) })), [purchaseInvoices, supplierNameById])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedPurchaseInvoiceId(null)
    setEditorDefaults(undefined)
    setIsEditorOpen(true)
  }

  const openEditDialog = (purchaseInvoiceId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedPurchaseInvoiceId(purchaseInvoiceId)
    setEditorDefaults(undefined)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedPurchaseInvoiceId(null)
    setEditorDefaults(undefined)
  }

  const handleSaved = async (purchaseInvoice: PurchaseInvoiceDetailsResponse, mode: PurchaseInvoiceDialogMode) => {
    setFeedback(mode === 'create' ? `Purchase invoice ${purchaseInvoice.invoiceNumber} created.` : `Purchase invoice ${purchaseInvoice.invoiceNumber} updated.`)
    handleEditorClose()
    await loadPurchaseInvoices()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    setFeedback(null)
    try {
      await deletePurchaseInvoice(deleteTarget.id)
      setFeedback(`Purchase invoice ${deleteTarget.invoiceNumber} deleted.`)
      if (activeLinesInvoice?.id === deleteTarget.id) {
        setActiveLinesInvoice(null)
        setLines([])
      }
      setDeleteTarget(null)
      await loadPurchaseInvoices()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) setError(deleteError.message)
      else setError('Unable to delete purchase invoice.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManageLines = async (row: PurchaseInvoiceGridRow) => {
    setActiveLinesInvoice(row)
    await loadLines(row.id)
  }

  const handleRecordPayment = (row: PurchaseInvoiceGridRow) => {
    navigate('/vendor-payments', {
      state: {
        supplierId: row.supplierId,
        purchaseInvoiceId: row.id,
        currencyCode: row.currencyCode,
        amount: row.balanceDue,
        paymentDate: new Date().toISOString().slice(0, 10),
        referenceNumber: row.invoiceNumber,
        paymentMethod: '',
        notes: '',
      },
    })
  }

  if (!isAuthenticated) {
    return <OrderWorkspace title={t('nav.routeTitles.purchaseInvoices')} description={t('pages.purchaseInvoices.description')} createLabel={t('pages.purchaseInvoices.newButton')} onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: t('pages.purchaseInvoices.signInRequired') }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.purchaseInvoices')}
      description={t('pages.purchaseInvoices.description')}
      createLabel={t('pages.purchaseInvoices.newButton')}
      onCreate={openCreateDialog}
      disableCreate={suppliers.length === 0}
      metrics={[
        { icon: <DescriptionRoundedIcon fontSize="small" />, label: t('pages.purchaseInvoices.metrics.invoices'), value: purchaseInvoices.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: t('pages.purchaseInvoices.metrics.openBalance'), value: formatMoney(purchaseInvoices.reduce((sum, purchaseInvoice) => sum + purchaseInvoice.balanceDue, 0)) },
        { icon: <PaidRoundedIcon fontSize="small" />, label: t('pages.purchaseInvoices.metrics.paidTotal'), value: formatMoney(purchaseInvoices.reduce((sum, purchaseInvoice) => sum + purchaseInvoice.paidTotal, 0)) },
      ]}
      alerts={[
        ...(!suppliers.length ? [{ severity: 'warning' as const, message: t('pages.purchaseInvoices.createSupplierFirst') }] : []),
        ...(suppliersError ? [{ severity: 'warning' as const, message: suppliersError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
        { severity: 'info' as const, message: outstandingOnly ? t('pages.purchaseInvoices.showingOutstandingOnly') : t('pages.purchaseInvoices.showingAll') },
      ]}
      grid={<Suspense fallback={<PurchaseInvoiceSurfaceFallback />}><Stack spacing={1.5}><FormControlLabel control={<Switch checked={outstandingOnly} onChange={(_, checked) => setOutstandingOnly(checked)} />} label={t('pages.purchaseInvoices.outstandingOnly')} /><PurchaseInvoiceDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onRecordPayment={handleRecordPayment} /></Stack></Suspense>}
      linesPanel={<Suspense fallback={<PurchaseInvoiceSurfaceFallback />}><PurchaseInvoiceLinesPanel invoice={activeLinesInvoice} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesInvoice ? loadLines(activeLinesInvoice.id) : Promise.resolve()} /></Suspense>}
      documentsPanel={<DocumentsPanel sourceType="PurchaseInvoice" sourceEntityId={activeLinesInvoice?.id ?? null} />}
      editor={isEditorOpen ? <Suspense fallback={<PurchaseInvoiceSurfaceFallback />}><PurchaseInvoiceEditorDialog key={`${dialogMode}:${selectedPurchaseInvoiceId ?? 'new'}:${editorDefaults?.sourcePurchaseOrderId ?? 'manual'}`} open={isEditorOpen} mode={dialogMode} purchaseInvoiceId={selectedPurchaseInvoiceId} suppliers={suppliers} initialValues={editorDefaults} onClose={handleEditorClose} onSaved={(purchaseInvoice, mode) => void handleSaved(purchaseInvoice, mode)} /></Suspense> : null}
      deleteDialog={deleteTarget ? <Suspense fallback={null}><PurchaseInvoiceDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}