import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { PaidRoundedIcon, ReceiptLongRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxBox, VxCircularProgress, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import DocumentsPanel from '../../../components/DocumentsPanel'
import DocumentFulfillmentPanel from '../../../components/DocumentFulfillmentPanel'
import DocumentReviewPanel from '../../../components/DocumentReviewPanel'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { ApiError, deleteSalesOrder, getSalesOrder, getSalesOrderLines, getSalesOrders } from '../../../lib/api'
import { useCustomersLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import type { SalesOrderDetailsResponse, SalesOrderLineListItemResponse, SalesOrderListItemResponse } from '../../../types/api'
import type { SalesOrderDialogMode, SalesOrderGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'

const SalesOrderEditorDialog = lazy(() => import('../components/SalesOrderEditorDialog'))
const SalesOrderDataGrid = lazy(() => import('../components/SalesOrderDataGrid'))
const SalesOrderDeleteDialog = lazy(() => import('../components/SalesOrderDeleteDialog'))
const SalesOrderLinesPanel = lazy(() => import('../components/SalesOrderLinesPanel'))

function SalesOrderSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxCircularProgress size={28} />
        <VxTypography color="text.secondary">{t('pages.salesOrders.loadingTools')}</VxTypography>
      </VxStack>
    </VxBox>
  )
}

export default function SalesOrdersPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.sales.manage) ?? false
  const canViewCustomers = user?.permissions.includes(Permissions.customers.view) ?? false
  const canViewProducts = user?.permissions.includes(Permissions.products.view) ?? false
  const canViewInventory = user?.permissions.includes(Permissions.inventory.view) ?? false
  const canViewAudit = user?.permissions.includes(Permissions.accounting.view) ?? false
  const navigate = useNavigate()
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated && canViewCustomers)
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated && canViewInventory)
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
    return <OrderWorkspace title={t('nav.routeTitles.salesOrders')} description={t('pages.salesOrders.description')} createLabel={t('pages.salesOrders.newButton')} onCreate={() => undefined} disableCreate metrics={[]} alerts={[{ severity: 'info', message: t('pages.salesOrders.signInRequired') }]} grid={null} linesPanel={null} />
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.salesOrders')}
      description={t('pages.salesOrders.description')}
      createLabel={t('pages.salesOrders.newButton')}
      onCreate={openCreateDialog}
      showCreate={canManage}
      disableCreate={customers.length === 0 || warehouses.length === 0}
      metrics={[
        { icon: <ReceiptLongRoundedIcon fontSize="small" />, label: t('pages.salesOrders.metrics.openHeaders'), value: salesOrders.length },
        { icon: <ScheduleRoundedIcon fontSize="small" />, label: t('pages.salesOrders.metrics.draftOrders'), value: salesOrders.filter((salesOrder) => salesOrder.status === 1).length },
        { icon: <PaidRoundedIcon fontSize="small" />, label: t('pages.salesOrders.metrics.totalValue'), value: formatMoney(salesOrders.reduce((sum, salesOrder) => sum + salesOrder.totalAmount, 0)) },
      ]}
      alerts={[
        ...(!customers.length ? [{ severity: 'warning' as const, message: t('pages.salesOrders.createCustomerFirst') }] : []),
        ...(!warehouses.length ? [{ severity: 'warning' as const, message: t('pages.salesOrders.createWarehouseFirst') }] : []),
        ...(customersError ? [{ severity: 'warning' as const, message: customersError }] : []),
        ...(warehousesError ? [{ severity: 'warning' as const, message: warehousesError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
        ...(!canManage ? [{ severity: 'info' as const, message: t('authorization.readOnly', { requiredPermission: Permissions.sales.manage }) }] : []),
      ]}
      grid={<Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderDataGrid rows={rows} isLoading={isLoading} onEdit={openEditDialog} onDelete={setDeleteTarget} onManageLines={(row) => void handleManageLines(row)} onCreateInvoice={handleCreateInvoice} onViewShipments={handleViewShipments} canManage={canManage} /></Suspense>}
      reviewOpen={Boolean(activeLinesOrder)}
      reviewPanel={<DocumentReviewPanel entityId={activeLinesOrder?.id ?? null} entityName="SalesOrder" documentNumber={activeLinesOrder?.orderNumber} canViewAudit={canViewAudit} loadDetails={getSalesOrder} getFields={(details) => [
        { label: t('orderWorkflow.review.partner'), value: customerNameById.get(details.customerId) ?? details.customerId },
        { label: t('orderWorkflow.review.warehouse'), value: warehouseNameById.get(details.warehouseId) ?? details.warehouseId },
        { label: t('orderWorkflow.review.documentDate'), value: details.orderDate },
        { label: t('orderWorkflow.review.requiredDate'), value: details.requiredDate },
        { label: t('orderWorkflow.review.currency'), value: details.currencyCode },
        { label: t('orderWorkflow.review.total'), value: formatMoney(details.totalAmount) },
        { label: t('orderWorkflow.review.status'), value: t(`orderWorkflow.lifecycle.orderStatusLabels.${details.status}`) },
        { label: t('orderWorkflow.review.notes'), value: details.notes },
      ]} />}
      relatedPanel={<DocumentFulfillmentPanel kind="shipment" sourceOrderId={activeLinesOrder?.id ?? null} />}
      linesPanel={<Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderLinesPanel order={activeLinesOrder} lines={lines} isLoading={linesLoading} error={linesError} onRefresh={() => activeLinesOrder ? loadLines(activeLinesOrder.id) : Promise.resolve()} canManage={canManage} canViewProducts={canViewProducts} canViewInventory={canViewInventory} /></Suspense>}
      documentsPanel={<DocumentsPanel sourceType="SalesOrder" sourceEntityId={activeLinesOrder?.id ?? null} />}
      editor={canManage && isEditorOpen ? <Suspense fallback={<SalesOrderSurfaceFallback />}><SalesOrderEditorDialog key={`${dialogMode}:${selectedSalesOrderId ?? 'new'}`} open={isEditorOpen} mode={dialogMode} salesOrderId={selectedSalesOrderId} customers={customers} warehouses={warehouses} onClose={handleEditorClose} onSaved={(salesOrder, mode) => void handleSaved(salesOrder, mode)} /></Suspense> : null}
      deleteDialog={canManage && deleteTarget ? <Suspense fallback={null}><SalesOrderDeleteDialog target={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} /></Suspense> : null}
    />
  )
}
