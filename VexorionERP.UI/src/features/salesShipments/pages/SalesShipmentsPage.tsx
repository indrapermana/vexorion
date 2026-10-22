import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { VxAlert, VxAutocomplete, VxButton, VxStack, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteSalesShipment, getSalesOrders, getSalesShipmentsForOrder, postSalesShipment } from '../../../lib/api'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import type { SalesOrderListItemResponse, SalesShipmentListItemResponse } from '../../../types/api'
import type { SalesShipmentGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState } from '../../../components/PagePrimitives'

const SalesShipmentDataGrid = lazy(() => import('../components/SalesShipmentDataGrid'))
const CreateSalesShipmentDialog = lazy(() => import('../components/CreateSalesShipmentDialog'))

function LoadingFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.salesShipments.loadingTools')} />
  )
}

type SourceState = { sourceSalesOrderId?: string | null; salesOrderNumber?: string | null }

export default function SalesShipmentsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.sales.manage) ?? false
  const canViewInventory = user?.permissions.includes(Permissions.inventory.view) ?? false
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null

  const { items: warehouses } = useWarehousesLookup(isAuthenticated && canViewInventory)

  const [salesOrders, setSalesOrders] = useState<SalesOrderListItemResponse[]>([])
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderListItemResponse | null>(null)
  const [shipments, setShipments] = useState<SalesShipmentListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Load all sales orders for the selector
  useEffect(() => {
    if (!isAuthenticated) return
    void getSalesOrders()
      .then((orders) => {
        setSalesOrders(orders)
        // Pre-select if navigated from a sales order
        const preselectedId = sourceState?.sourceSalesOrderId
        if (preselectedId) {
          const match = orders.find((o) => o.id === preselectedId) ?? null
          setSelectedOrder(match)
        }
      })
      .catch(() => { /* non-critical */ })
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadShipments = useCallback(async () => {
    if (!isAuthenticated || !selectedOrder) {
      setShipments([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setShipments(await getSalesShipmentsForOrder(selectedOrder.id))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to load sales shipments.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedOrder])

  useEffect(() => { void loadShipments() }, [loadShipments])

  const handlePost = async (row: SalesShipmentGridRow) => {
    setFeedback(null)
    try {
      await postSalesShipment(row.id)
      setFeedback(`Shipment ${row.shipmentNumber} posted successfully.`)
      await loadShipments()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to post shipment.')
    }
  }

  const handleDelete = async (row: SalesShipmentGridRow) => {
    setFeedback(null)
    try {
      await deleteSalesShipment(row.id)
      setFeedback(`Shipment ${row.shipmentNumber} deleted.`)
      await loadShipments()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to delete shipment.')
    }
  }

  const handleSaved = async () => {
    setIsCreateOpen(false)
    await loadShipments()
  }

  const rows: SalesShipmentGridRow[] = shipments

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.salesShipments.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={2}>
      <PageHeader
        title={t('nav.routeTitles.salesShipments')}
        description={t('pages.salesShipments.navigateFromOrder')}
        primaryAction={canManage ? <VxButton variant="contained" disabled={!selectedOrder} onClick={() => setIsCreateOpen(true)}>{t('pages.salesShipments.newButton')}</VxButton> : null}
        filters={(
          <VxAutocomplete
            options={salesOrders}
            value={selectedOrder}
            onChange={(_, value) => {
              setSelectedOrder(value)
              setFeedback(null)
              setError(null)
            }}
            getOptionLabel={(o) => o.orderNumber}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <VxTextField {...params} label={t('pages.salesShipments.filterByOrder')} size="small" />}
            sx={{ maxWidth: 320 }}
          />
        )}
      />

      <PageFeedback error={error} success={feedback} info={!selectedOrder ? t('pages.salesShipments.selectOrderPrompt') : null} onRetry={error && selectedOrder ? () => void loadShipments() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.sales.manage} /> : null}

      {selectedOrder && (
        <PageBody>
          <Suspense fallback={<LoadingFallback />}>
            <SalesShipmentDataGrid rows={rows} isLoading={isLoading} onPost={handlePost} onDelete={handleDelete} canManage={canManage} />
          </Suspense>
        </PageBody>
      )}

      {canManage && isCreateOpen && selectedOrder && (
        <Suspense fallback={<LoadingFallback />}>
          <CreateSalesShipmentDialog
            open={isCreateOpen}
            salesOrderId={selectedOrder.id}
            warehouses={warehouses}
            onClose={() => setIsCreateOpen(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
    </VxStack>
  )
}
