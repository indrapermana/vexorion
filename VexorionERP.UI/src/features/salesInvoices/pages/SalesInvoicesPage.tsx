import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
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
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading sales invoice tools...</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = Partial<SalesInvoiceFormValues> & { sourceSalesOrderId?: string | null }

export default function SalesInvoicesPage() {
  const { isAuthenticated } = useAuth()
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceListItemResponse[]>([])
  const [lines, setLines] = useState<SalesInvoiceLineListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linesLoading, setLinesLoading] = useState(false)
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
      setSalesInvoices(await getSalesInvoices())
      await reloadCustomers()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load sales invoices.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadCustomers])

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

  if (!isAuthenticated) {
    return <OrderWorkspace title="Sales Invoices" description="Accounts receivable invoice headers from `/api/sales-invoices`, linked to customer master data and invoice line detail." createLabel="New sales invoice" onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: 'Sign in first. The sales invoices API requires an authenticated user with sales view permissions.' }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title="Sales Invoices"
      description="Accounts receivable invoice headers from `/api/sales-invoices`, with balance visibility and line-level billing tools."
      createLabel="New sales invoice"
      onCreate={openCreateDialog}
      disableCreate={customers.length === 0}
      metrics={[
        { icon: <DescriptionRoundedIcon fontSize="small" />, label: 'Invoices', value: salesInvoices.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: 'Open balance', value: `$${salesInvoices.reduce((sum, salesInvoice) => sum + salesInvoice.balanceDue, 0).toFixed(2)}` },
        { icon: <PaidRoundedIcon fontSize="small" />, label: 'Paid total', value: `$${salesInvoices.reduce((sum, salesInvoice) => sum + salesInvoice.paidTotal, 0).toFixed(2)}` },
      ]}
      alerts={[
        ...(!customers.length ? [{ severity: 'warning' as const, message: 'Create at least one customer before creating sales invoices.' }] : []),
        ...(customersError ? [{ severity: 'warning' as const, message: customersError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
      ]}
      grid={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} /></Suspense>}
      linesPanel={<Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceLinesPanel invoice={activeLinesInvoice} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesInvoice ? loadLines(activeLinesInvoice.id) : Promise.resolve()} /></Suspense>}
      editor={isEditorOpen ? <Suspense fallback={<SalesInvoiceSurfaceFallback />}><SalesInvoiceEditorDialog key={`${dialogMode}:${selectedSalesInvoiceId ?? 'new'}:${editorDefaults?.sourceSalesOrderId ?? 'manual'}`} open={isEditorOpen} mode={dialogMode} salesInvoiceId={selectedSalesInvoiceId} customers={customers} initialValues={editorDefaults} onClose={handleEditorClose} onSaved={(salesInvoice, mode) => void handleSaved(salesInvoice, mode)} /></Suspense> : null}
      deleteDialog={deleteTarget ? <Suspense fallback={null}><SalesInvoiceDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}