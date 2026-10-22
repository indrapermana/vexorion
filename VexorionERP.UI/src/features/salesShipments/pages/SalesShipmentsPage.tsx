import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { VxAlert, VxAutocomplete, VxButton, VxConfirmActionDialog, VxStack, VxTextField } from '@vexorion/ui'
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
  const [pendingAction, setPendingAction] = useState<{ type: 'post' | 'delete'; row: SalesShipmentGridRow } | null>(null)
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
    setActionError(null)
    setIsActionPending(true)
    try {
      await postSalesShipment(row.id)
      setFeedback(`Shipment ${row.shipmentNumber} posted successfully.`)
      setPendingAction(null)
      await loadShipments()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to post shipment.')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleDelete = async (row: SalesShipmentGridRow) => {
    setFeedback(null)
    setActionError(null)
    setIsActionPending(true)
    try {
      await deleteSalesShipment(row.id)
      setFeedback(`Shipment ${row.shipmentNumber} deleted.`)
      setPendingAction(null)
      await loadShipments()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete shipment.')
    } finally {
      setIsActionPending(false)
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
            <SalesShipmentDataGrid rows={rows} isLoading={isLoading} onPost={(row) => { setActionError(null); setPendingAction({ type: 'post', row }) }} onDelete={(row) => { setActionError(null); setPendingAction({ type: 'delete', row }) }} canManage={canManage} />
          </Suspense>
        </PageBody>
      )}

      <VxConfirmActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.type === 'post' ? 'Post shipment' : 'Delete shipment'}
        targetName={pendingAction?.row.shipmentNumber ?? ''}
        consequence={pendingAction?.type === 'post'
          ? 'Posting updates inventory and makes the shipment operationally final. Corrections require a separate reversal workflow.'
          : 'This permanently removes the draft shipment. This action cannot be undone.'}
        confirmLabel={pendingAction?.type === 'post' ? 'Post shipment' : 'Delete shipment'}
        pendingLabel={pendingAction?.type === 'post' ? 'Posting...' : 'Deleting...'}
        pending={isActionPending}
        error={actionError}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return
          void (pendingAction.type === 'post' ? handlePost(pendingAction.row) : handleDelete(pendingAction.row))
        }}
      />

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
