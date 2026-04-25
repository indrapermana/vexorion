import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deleteSalesOrder, getSalesOrderLines, getSalesOrders } from '../../../lib/api'
import { useCustomersLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import type { SalesOrderDetailsResponse, SalesOrderLineListItemResponse, SalesOrderListItemResponse } from '../../../types/api'
import type { SalesOrderDialogMode, SalesOrderGridRow } from '../../../types/ui'

const SalesOrderEditorDialog = lazy(() => import('../components/SalesOrderEditorDialog'))
const SalesOrderDataGrid = lazy(() => import('../components/SalesOrderDataGrid'))
const SalesOrderDeleteDialog = lazy(() => import('../components/SalesOrderDeleteDialog'))
const SalesOrderLinesPanel = lazy(() => import('../components/SalesOrderLinesPanel'))

function SalesOrderSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading sales order tools...</Typography>
      </Stack>
    </Box>
  )
}

export default function SalesOrdersPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated)
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const [salesOrders, setSalesOrders] = useState<SalesOrderListItemResponse[]>([])
  const [lines, setLines] = useState<SalesOrderLineListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linesLoading, setLinesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linesError, setLinesError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<SalesOrderDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(null)
  const [activeLinesOrder, setActiveLinesOrder] = useState<SalesOrderGridRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSalesOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setSalesOrders([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setSalesOrders(await getSalesOrders())
      await reloadCustomers()
      await reloadWarehouses()
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load sales orders.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadCustomers, reloadWarehouses])

  useEffect(() => {
    void loadSalesOrders()
  }, [loadSalesOrders])

  const loadLines = useCallback(async (orderId: string) => {
    setLinesLoading(true)
    setLinesError(null)

    try {
      setLines(await getSalesOrderLines(orderId))
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setLinesError(loadError.message)
      } else {
        setLinesError('Unable to load sales order lines.')
      }
    } finally {
      setLinesLoading(false)
    }
  }, [])

  const customerNameById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers])
  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
  const rows = useMemo(() => salesOrders.map((salesOrder) => ({
    ...salesOrder,
    customerName: customerNameById.get(salesOrder.customerId),
    warehouseName: warehouseNameById.get(salesOrder.warehouseId),
  })), [customerNameById, salesOrders, warehouseNameById])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedSalesOrderId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (salesOrderId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedSalesOrderId(salesOrderId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedSalesOrderId(null)
  }

  const handleSaved = async (salesOrder: SalesOrderDetailsResponse, mode: SalesOrderDialogMode) => {
    setFeedback(mode === 'create' ? `Sales order ${salesOrder.orderNumber} created.` : `Sales order ${salesOrder.orderNumber} updated.`)
    handleEditorClose()
    await loadSalesOrders()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteSalesOrder(deleteTarget.id)
      setFeedback(`Sales order ${deleteTarget.orderNumber} deleted.`)
      if (activeLinesOrder?.id === deleteTarget.id) {
        setActiveLinesOrder(null)
        setLines([])
      }
      setDeleteTarget(null)
      await loadSalesOrders()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete sales order.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManageLines = async (row: SalesOrderGridRow) => {
    setActiveLinesOrder(row)
    await loadLines(row.id)
  }

  const handleCreateInvoice = (row: SalesOrderGridRow) => {
    navigate('/sales-invoices', {
      state: {
        sourceSalesOrderId: row.id,
        invoiceNumber: `${row.orderNumber}-INV`,
        customerId: row.customerId,
        currencyCode: row.currencyCode,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        status: 1,
        notes: '',
        isActive: true,
      },
    })
  }

  const handleViewShipments = (row: SalesOrderGridRow) => {
    navigate('/sales-shipments', {
      state: {
        sourceSalesOrderId: row.id,
        salesOrderNumber: row.orderNumber,
      },
    })
  }

  if (!isAuthenticated) {
    return <OrderWorkspace title="Sales Orders" description="Transactional sales headers from `/api/sales-orders`, linked to customer master data for selection and display." createLabel="New sales order" onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: 'Sign in first. The sales orders API requires an authenticated user with sales view permissions.' }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title="Sales Orders"
      description="Transactional sales headers from `/api/sales-orders`, linked to customer master data for selection and display."
      createLabel="New sales order"
      onCreate={openCreateDialog}
      disableCreate={customers.length === 0 || warehouses.length === 0}
      metrics={[
        { icon: <ReceiptLongRoundedIcon fontSize="small" />, label: 'Open headers', value: salesOrders.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: 'Draft orders', value: salesOrders.filter((salesOrder) => salesOrder.status === 1).length },
        { icon: <PaidRoundedIcon fontSize="small" />, label: 'Total value', value: `$${salesOrders.reduce((sum, salesOrder) => sum + salesOrder.totalAmount, 0).toFixed(2)}` },
      ]}
      alerts={[
        ...(!customers.length ? [{ severity: 'warning' as const, message: 'Create at least one customer before creating sales orders.' }] : []),
        ...(!warehouses.length ? [{ severity: 'warning' as const, message: 'Create at least one warehouse before creating sales orders.' }] : []),
        ...(customersError ? [{ severity: 'warning' as const, message: customersError }] : []),
        ...(warehousesError ? [{ severity: 'warning' as const, message: warehousesError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
      ]}
      grid={<Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onCreateInvoice={handleCreateInvoice} onViewShipments={handleViewShipments} /></Suspense>}
      linesPanel={<Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderLinesPanel order={activeLinesOrder} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesOrder ? loadLines(activeLinesOrder.id) : Promise.resolve()} /></Suspense>}
      editor={isEditorOpen ? <Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderEditorDialog key={`${dialogMode}:${selectedSalesOrderId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} salesOrderId={selectedSalesOrderId} customers={customers} warehouses={warehouses} onClose={handleEditorClose} onSaved={(salesOrder, mode) => void handleSaved(salesOrder, mode)} /></Suspense> : null}
      deleteDialog={deleteTarget ? <Suspense fallback={null}><SalesOrderDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}