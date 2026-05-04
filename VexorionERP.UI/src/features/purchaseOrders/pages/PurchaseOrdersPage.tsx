import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import DocumentsPanel from '../../../components/DocumentsPanel'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deletePurchaseOrder, getPurchaseOrderLines, getPurchaseOrders } from '../../../lib/api'
import { useSuppliersLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import type { PurchaseOrderDetailsResponse, PurchaseOrderLineListItemResponse, PurchaseOrderListItemResponse } from '../../../types/api'
import type { PurchaseOrderDialogMode, PurchaseOrderGridRow } from '../../../types/ui'

const PurchaseOrderEditorDialog = lazy(() => import('../components/PurchaseOrderEditorDialog'))
const PurchaseOrderDataGrid = lazy(() => import('../components/PurchaseOrderDataGrid'))
const PurchaseOrderDeleteDialog = lazy(() => import('../components/PurchaseOrderDeleteDialog'))
const PurchaseOrderLinesPanel = lazy(() => import('../components/PurchaseOrderLinesPanel'))

function PurchaseOrderSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.purchaseOrders.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

export default function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { items: suppliers, error: suppliersError, reload: reloadSuppliers } = useSuppliersLookup(isAuthenticated)
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItemResponse[]>([])
  const [lines, setLines] = useState<PurchaseOrderLineListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [linesLoading, setLinesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linesError, setLinesError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<PurchaseOrderDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null)
  const [activeLinesOrder, setActiveLinesOrder] = useState<PurchaseOrderGridRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPurchaseOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setPurchaseOrders([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setPurchaseOrders(await getPurchaseOrders())
      await reloadSuppliers()
      await reloadWarehouses()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load purchase orders.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadSuppliers, reloadWarehouses])

  const loadLines = useCallback(async (orderId: string) => {
    setLinesLoading(true)
    setLinesError(null)
    try {
      setLines(await getPurchaseOrderLines(orderId))
    } catch (loadError) {
      if (loadError instanceof ApiError) setLinesError(loadError.message)
      else setLinesError('Unable to load purchase order lines.')
    } finally {
      setLinesLoading(false)
    }
  }, [])

  const supplierNameById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])), [suppliers])
  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
  const rows = useMemo(() => purchaseOrders.map((purchaseOrder) => ({
    ...purchaseOrder,
    supplierName: supplierNameById.get(purchaseOrder.supplierId),
    warehouseName: warehouseNameById.get(purchaseOrder.warehouseId),
  })), [purchaseOrders, supplierNameById, warehouseNameById])

  useEffect(() => {
    void loadPurchaseOrders()
  }, [loadPurchaseOrders])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedPurchaseOrderId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (purchaseOrderId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedPurchaseOrderId(purchaseOrderId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedPurchaseOrderId(null)
  }

  const handleSaved = async (purchaseOrder: PurchaseOrderDetailsResponse, mode: PurchaseOrderDialogMode) => {
    setFeedback(mode === 'create' ? `Purchase order ${purchaseOrder.orderNumber} created.` : `Purchase order ${purchaseOrder.orderNumber} updated.`)
    handleEditorClose()
    await loadPurchaseOrders()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    setFeedback(null)
    try {
      await deletePurchaseOrder(deleteTarget.id)
      setFeedback(`Purchase order ${deleteTarget.orderNumber} deleted.`)
      if (activeLinesOrder?.id === deleteTarget.id) {
        setActiveLinesOrder(null)
        setLines([])
      }
      setDeleteTarget(null)
      await loadPurchaseOrders()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) setError(deleteError.message)
      else setError('Unable to delete purchase order.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManageLines = async (row: PurchaseOrderGridRow) => {
    setActiveLinesOrder(row)
    await loadLines(row.id)
  }

  const handleCreateInvoice = (row: PurchaseOrderGridRow) => {
    navigate('/purchase-invoices', {
      state: {
        sourcePurchaseOrderId: row.id,
        invoiceNumber: `${row.orderNumber}-INV`,
        supplierId: row.supplierId,
        currencyCode: row.currencyCode,
        vendorReferenceNumber: row.orderNumber,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        status: 1,
        notes: '',
        isActive: true,
      },
    })
  }

  const handleViewReceipts = (row: PurchaseOrderGridRow) => {
    navigate('/purchase-receipts', {
      state: {
        sourcePurchaseOrderId: row.id,
        purchaseOrderNumber: row.orderNumber,
      },
    })
  }

  if (!isAuthenticated) {
    return <OrderWorkspace title={t('nav.routeTitles.purchaseOrders')} description={t('pages.purchaseOrders.description')} createLabel={t('pages.purchaseOrders.newButton')} onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: t('pages.purchaseOrders.signInRequired') }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.purchaseOrders')}
      description={t('pages.purchaseOrders.description')}
      createLabel={t('pages.purchaseOrders.newButton')}
      onCreate={openCreateDialog}
      disableCreate={suppliers.length === 0 || warehouses.length === 0}
      metrics={[
        { icon: <ReceiptLongRoundedIcon fontSize="small" />, label: t('pages.purchaseOrders.metrics.openHeaders'), value: purchaseOrders.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: t('pages.purchaseOrders.metrics.draftOrders'), value: purchaseOrders.filter((purchaseOrder) => purchaseOrder.status === 1).length },
        { icon: <PaidRoundedIcon fontSize="small" />, label: t('pages.purchaseOrders.metrics.totalValue'), value: formatMoney(purchaseOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0)) },
      ]}
      alerts={[
        ...(!suppliers.length ? [{ severity: 'warning' as const, message: t('pages.purchaseOrders.createSupplierFirst') }] : []),
        ...(!warehouses.length ? [{ severity: 'warning' as const, message: t('pages.purchaseOrders.createWarehouseFirst') }] : []),
        ...(suppliersError ? [{ severity: 'warning' as const, message: suppliersError }] : []),
        ...(warehousesError ? [{ severity: 'warning' as const, message: warehousesError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
      ]}
      grid={<Suspense fallback={<PurchaseOrderSurfaceFallback />}><PurchaseOrderDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onCreateInvoice={handleCreateInvoice} onViewReceipts={handleViewReceipts} /></Suspense>}
      linesPanel={<Suspense fallback={<PurchaseOrderSurfaceFallback />}><PurchaseOrderLinesPanel order={activeLinesOrder} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesOrder ? loadLines(activeLinesOrder.id) : Promise.resolve()} /></Suspense>}
      documentsPanel={<DocumentsPanel sourceType="PurchaseOrder" sourceEntityId={activeLinesOrder?.id ?? null} />}
      editor={isEditorOpen ? <Suspense fallback={<PurchaseOrderSurfaceFallback />}><PurchaseOrderEditorDialog key={`${dialogMode}:${selectedPurchaseOrderId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} purchaseOrderId={selectedPurchaseOrderId} suppliers={suppliers} warehouses={warehouses} onClose={handleEditorClose} onSaved={(purchaseOrder, mode) => void handleSaved(purchaseOrder, mode)} /></Suspense> : null}
      deleteDialog={deleteTarget ? <Suspense fallback={null}><PurchaseOrderDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}