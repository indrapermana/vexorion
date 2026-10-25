import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { DescriptionRoundedIcon, PaidRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxBox, VxCircularProgress, VxFormControlLabel, VxStack, VxSwitch, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import DocumentsPanel from '../../../components/DocumentsPanel'
import DocumentPaymentAllocationsPanel from '../../../components/DocumentPaymentAllocationsPanel'
import DocumentReviewPanel from '../../../components/DocumentReviewPanel'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deleteSalesInvoice, getSalesInvoice, getSalesInvoiceLines, getSalesInvoices } from '../../../lib/api'
import { useCustomersLookup } from '../../../hooks/useLookups'
import type { SalesInvoiceDetailsResponse, SalesInvoiceLineListItemResponse, SalesInvoiceListItemResponse } from '../../../types/api'
import type { SalesInvoiceDialogMode, SalesInvoiceFormValues, SalesInvoiceGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'

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
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.sales.manage) ?? false
  const canViewCustomers = user?.permissions.includes(Permissions.customers.view) ?? false
  const canViewProducts = user?.permissions.includes(Permissions.products.view) ?? false
  const canViewAudit = user?.permissions.includes(Permissions.accounting.view) ?? false
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated && canViewCustomers)
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

    if (!canManage) {
      void navigate(location.pathname, { replace: true, state: null })
      return
    }

    setDialogMode('create')
    setSelectedSalesInvoiceId(null)
    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [canManage, location.pathname, navigate, sourceState])

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
      showCreate={canManage}
      disableCreate={customers.length === 0}
      filters={<VxFormControlLabel control={<VxSwitch checked={outstandingOnly} onChange={(_, checked) => setOutstandingOnly(checked)} />} label={t('pages.salesInvoices.outstandingOnly')} />}
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
        ...(!canManage ? [{ severity: 'info' as const, message: t('authorization.readOnly', { requiredPermission: Permissions.sales.manage }) }] : []),
      ]}
      grid={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onRecordPayment={handleRecordPayment} canManage={canManage} /></Suspense>}
      reviewOpen={Boolean(activeLinesInvoice)}
      reviewPanel={<DocumentReviewPanel entityId={activeLinesInvoice?.id ?? null} entityName="SalesInvoice" documentNumber={activeLinesInvoice?.invoiceNumber} canViewAudit={canViewAudit} loadDetails={getSalesInvoice} getFields={(details) => [
        { label: t('orderWorkflow.review.partner'), value: customerNameById.get(details.customerId) ?? details.customerId },
        { label: t('orderWorkflow.review.documentDate'), value: details.invoiceDate },
        { label: t('orderWorkflow.review.dueDate'), value: details.dueDate },
        { label: t('orderWorkflow.review.paymentTerm'), value: details.paymentTermId },
        { label: t('orderWorkflow.review.sourceOrder'), value: details.sourceSalesOrderId },
        { label: t('orderWorkflow.review.sourceFulfillment'), value: details.sourceSalesShipmentId },
        { label: t('orderWorkflow.review.currency'), value: details.currencyCode },
        { label: t('orderWorkflow.review.subtotal'), value: formatMoney(details.subtotal) },
        { label: t('orderWorkflow.review.tax'), value: formatMoney(details.taxTotal) },
        { label: t('orderWorkflow.review.total'), value: formatMoney(details.grandTotal) },
        { label: t('orderWorkflow.review.paid'), value: formatMoney(details.paidTotal) },
        { label: t('orderWorkflow.review.balance'), value: formatMoney(details.balanceDue) },
        { label: t('orderWorkflow.review.status'), value: t(`orderWorkflow.lifecycle.invoiceStatusLabels.${details.status}`) },
        { label: t('orderWorkflow.review.notes'), value: details.notes },
      ]} />}
      relatedPanel={<DocumentPaymentAllocationsPanel kind="customer" invoiceId={activeLinesInvoice?.id ?? null} />}
      linesPanel={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceLinesPanel invoice={activeLinesInvoice} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesInvoice ? loadLines(activeLinesInvoice.id) : Promise.resolve()} canManage={canManage} canViewProducts={canViewProducts} /></Suspense>}
      documentsPanel={<DocumentsPanel sourceType="SalesInvoice" sourceEntityId={activeLinesInvoice?.id ?? null} />}
      editor={canManage && isEditorOpen ? <Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceEditorDialog key={`${dialogMode}:${selectedSalesInvoiceId ?? 'new'}:${editorDefaults?.sourceSalesOrderId ?? 'manual'}`} open={isEditorOpen} mode={dialogMode} salesInvoiceId={selectedSalesInvoiceId} customers={customers} initialValues={editorDefaults} onClose={handleEditorClose} onSaved={(salesInvoice, mode) => void handleSaved(salesInvoice, mode)} /></Suspense> : null}
      deleteDialog={canManage && deleteTarget ? <Suspense fallback={null}><SalesInvoiceDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}
