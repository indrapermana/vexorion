import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { DescriptionRoundedIcon, PaidRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxBox, VxCircularProgress, VxFormControlLabel, VxStack, VxSwitch, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import DocumentsPanel from '../../../components/DocumentsPanel'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deleteSalesInvoice, getSalesInvoiceLines, getSalesInvoices } from '../../../lib/api'
import { useCustomersLookup } from '../../../hooks/useLookups'
import type { SalesInvoiceDetailsResponse, SalesInvoiceLineListItemResponse, SalesInvoiceListItemResponse } from '../../../types/api'
import type { SalesInvoiceDialogMode, SalesInvoiceFormValues, SalesInvoiceGridRow } from '../../../types/ui'

const SalesInvoiceEditorDialog = lazy(() => import('../components/SalesInvoiceEditorDialog'))
const SalesInvoiceDataGrid = lazy(() => import('../components/SalesInvoiceDataGrid'))
const SalesInvoiceDeleteDialog = lazy(() => import('../components/SalesInvoiceDeleteDialog'))
const SalesInvoiceLinesPanel = lazy(() => import('../components/SalesInvoiceLinesPanel'))

function SalesInvoiceSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxCircularProgress size={28} />
        <VxTypography color="text.secondary">{t('pages.salesInvoices.loadingTools')}</VxTypography>
      </VxStack>
    </VxBox>
  )
}

type SourceState = Partial<SalesInvoiceFormValues> & { sourceSalesOrderId?: string | null }

export default function SalesInvoicesPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated } = useAuth()
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceListItemResponse[]>([])
  const [lines, setLines] = useState<SalesInvoiceLineListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linesLoading, setLinesLoading] = useState(false)
  const [outstandingOnly, setOutstandingOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linesError, setLinesError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<SalesInvoiceDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState<string | null>(null)
  const [editorDefaults, setEditorDefaults] = useState<Partial<SalesInvoiceFormValues> | undefined>(undefined)
  const [activeLinesInvoice, setActiveLinesInvoice] = useState<SalesInvoiceGridRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoiceGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSalesInvoices = useCallback(async () => {
    if (!isAuthenticated) {
      setSalesInvoices([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setSalesInvoices(await getSalesInvoices(outstandingOnly))
      await reloadCustomers()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load sales invoices.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, outstandingOnly, reloadCustomers])

  useEffect(() => {
    void loadSalesInvoices()
  }, [loadSalesInvoices])

  useEffect(() => {
    if (!sourceState?.sourceSalesOrderId) {
      return
    }

    setDialogMode('create')
    setSelectedSalesInvoiceId(null)
    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, navigate, sourceState])

  const loadLines = useCallback(async (invoiceId: string) => {
    setLinesLoading(true)
    setLinesError(null)
    try {
      setLines(await getSalesInvoiceLines(invoiceId))
    } catch (loadError) {
      if (loadError instanceof ApiError) setLinesError(loadError.message)
      else setLinesError('Unable to load sales invoice lines.')
    } finally {
      setLinesLoading(false)
    }
  }, [])

  const customerNameById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers])
  const rows = useMemo(() => salesInvoices.map((salesInvoice) => ({ ...salesInvoice, customerName: customerNameById.get(salesInvoice.customerId) })), [customerNameById, salesInvoices])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedSalesInvoiceId(null)
    setEditorDefaults(undefined)
    setIsEditorOpen(true)
  }

  const openEditDialog = (salesInvoiceId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedSalesInvoiceId(salesInvoiceId)
    setEditorDefaults(undefined)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedSalesInvoiceId(null)
    setEditorDefaults(undefined)
  }

  const handleSaved = async (salesInvoice: SalesInvoiceDetailsResponse, mode: SalesInvoiceDialogMode) => {
    setFeedback(mode === 'create' ? `Sales invoice ${salesInvoice.invoiceNumber} created.` : `Sales invoice ${salesInvoice.invoiceNumber} updated.`)
    handleEditorClose()
    await loadSalesInvoices()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    setFeedback(null)
    try {
      await deleteSalesInvoice(deleteTarget.id)
      setFeedback(`Sales invoice ${deleteTarget.invoiceNumber} deleted.`)
      if (activeLinesInvoice?.id === deleteTarget.id) {
        setActiveLinesInvoice(null)
        setLines([])
      }
      setDeleteTarget(null)
      await loadSalesInvoices()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) setError(deleteError.message)
      else setError('Unable to delete sales invoice.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManageLines = async (row: SalesInvoiceGridRow) => {
    setActiveLinesInvoice(row)
    await loadLines(row.id)
  }

  const handleRecordPayment = (row: SalesInvoiceGridRow) => {
    navigate('/customer-payments', {
      state: {
        customerId: row.customerId,
        salesInvoiceId: row.id,
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
    return <OrderWorkspace title={t('nav.routeTitles.salesInvoices')} description={t('pages.salesInvoices.description')} createLabel={t('pages.salesInvoices.newButton')} onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: t('pages.salesInvoices.signInRequired') }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.salesInvoices')}
      description={t('pages.salesInvoices.description')}
      createLabel={t('pages.salesInvoices.newButton')}
      onCreate={openCreateDialog}
      disableCreate={customers.length === 0}
      metrics={[
        { icon: <DescriptionRoundedIcon fontSize="small" />, label: t('pages.salesInvoices.metrics.invoices'), value: salesInvoices.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: t('pages.salesInvoices.metrics.openBalance'), value: formatMoney(salesInvoices.reduce((sum, salesInvoice) => sum + salesInvoice.balanceDue, 0)) },
        { icon: <PaidRoundedIcon fontSize="small" />, label: t('pages.salesInvoices.metrics.paidTotal'), value: formatMoney(salesInvoices.reduce((sum, salesInvoice) => sum + salesInvoice.paidTotal, 0)) },
      ]}
      alerts={[
        ...(!customers.length ? [{ severity: 'warning' as const, message: t('pages.salesInvoices.createCustomerFirst') }] : []),
        ...(customersError ? [{ severity: 'warning' as const, message: customersError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
        { severity: 'info' as const, message: outstandingOnly ? t('pages.salesInvoices.showingOutstandingOnly') : t('pages.salesInvoices.showingAll') },
      ]}
      grid={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><VxStack spacing={1.5}><VxFormControlLabel control={<VxSwitch checked={outstandingOnly} onChange={(_, checked) => setOutstandingOnly(checked)} />} label={t('pages.salesInvoices.outstandingOnly')} /><SalesInvoiceDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onRecordPayment={handleRecordPayment} /></VxStack></Suspense>}
      linesPanel={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceLinesPanel invoice={activeLinesInvoice} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesInvoice ? loadLines(activeLinesInvoice.id) : Promise.resolve()} /></Suspense>}
      documentsPanel={<DocumentsPanel sourceType="SalesInvoice" sourceEntityId={activeLinesInvoice?.id ?? null} />}
      editor={isEditorOpen ? <Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceEditorDialog key={`${dialogMode}:${selectedSalesInvoiceId ?? 'new'}:${editorDefaults?.sourceSalesOrderId ?? 'manual'}`} open={isEditorOpen} mode={dialogMode} salesInvoiceId={selectedSalesInvoiceId} customers={customers} initialValues={editorDefaults} onClose={handleEditorClose} onSaved={(salesInvoice, mode) => void handleSaved(salesInvoice, mode)} /></Suspense> : null}
      deleteDialog={deleteTarget ? <Suspense fallback={null}><SalesInvoiceDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}