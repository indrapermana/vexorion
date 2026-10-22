import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { VxAlert, VxAutocomplete, VxButton, VxConfirmActionDialog, VxStack, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deletePurchaseReceipt, getPurchaseOrders, getPurchaseReceiptsForOrder, postPurchaseReceipt } from '../../../lib/api'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import type { PurchaseOrderListItemResponse, PurchaseReceiptListItemResponse } from '../../../types/api'
import type { PurchaseReceiptGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState } from '../../../components/PagePrimitives'

const PurchaseReceiptDataGrid = lazy(() => import('../components/PurchaseReceiptDataGrid'))
const CreatePurchaseReceiptDialog = lazy(() => import('../components/CreatePurchaseReceiptDialog'))

function LoadingFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.purchaseReceipts.loadingTools')} />
  )
}

type SourceState = { sourcePurchaseOrderId?: string | null; purchaseOrderNumber?: string | null }

export default function PurchaseReceiptsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.purchasing.manage) ?? false
  const canViewInventory = user?.permissions.includes(Permissions.inventory.view) ?? false
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null

  const { items: warehouses } = useWarehousesLookup(isAuthenticated && canViewInventory)

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItemResponse[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderListItemResponse | null>(null)
  const [receipts, setReceipts] = useState<PurchaseReceiptListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: 'post' | 'delete'; row: PurchaseReceiptGridRow } | null>(null)
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Load all purchase orders for the selector
  useEffect(() => {
    if (!isAuthenticated) return
    void getPurchaseOrders()
      .then((orders) => {
        setPurchaseOrders(orders)
        // Pre-select if navigated from a purchase order
        const preselectedId = sourceState?.sourcePurchaseOrderId
        if (preselectedId) {
          const match = orders.find((o) => o.id === preselectedId) ?? null
          setSelectedOrder(match)
        }
      })
      .catch(() => { /* non-critical */ })
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadReceipts = useCallback(async () => {
    if (!isAuthenticated || !selectedOrder) {
      setReceipts([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setReceipts(await getPurchaseReceiptsForOrder(selectedOrder.id))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to load purchase receipts.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedOrder])

  useEffect(() => { void loadReceipts() }, [loadReceipts])

  const handlePost = async (row: PurchaseReceiptGridRow) => {
    setFeedback(null)
    setActionError(null)
    setIsActionPending(true)
    try {
      await postPurchaseReceipt(row.id)
      setFeedback(`Receipt ${row.receiptNumber} posted successfully.`)
      setPendingAction(null)
      await loadReceipts()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to post receipt.')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleDelete = async (row: PurchaseReceiptGridRow) => {
    setFeedback(null)
    setActionError(null)
    setIsActionPending(true)
    try {
      await deletePurchaseReceipt(row.id)
      setFeedback(`Receipt ${row.receiptNumber} deleted.`)
      setPendingAction(null)
      await loadReceipts()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete receipt.')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleSaved = async () => {
    setIsCreateOpen(false)
    await loadReceipts()
  }

  const rows: PurchaseReceiptGridRow[] = receipts

  if (!isAuthenticated) {
    return (
      <VxAlert severity="info">{t('pages.purchaseReceipts.signInRequired')}</VxAlert>
    )
  }

  return (
    <VxStack spacing={2}>
      <PageHeader
        title={t('nav.routeTitles.purchaseReceipts')}
        description={t('pages.purchaseReceipts.navigateFromOrder')}
        primaryAction={canManage ? <VxButton variant="contained" disabled={!selectedOrder} onClick={() => setIsCreateOpen(true)}>{t('pages.purchaseReceipts.newButton')}</VxButton> : null}
        filters={(
          <VxAutocomplete
            options={purchaseOrders}
            value={selectedOrder}
            onChange={(_, value) => {
              setSelectedOrder(value)
              setFeedback(null)
              setError(null)
            }}
            getOptionLabel={(o) => o.orderNumber}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <VxTextField {...params} label={t('pages.purchaseReceipts.filterByOrder')} size="small" />}
            sx={{ maxWidth: 320 }}
          />
        )}
      />

      <PageFeedback error={error} success={feedback} info={!selectedOrder ? t('pages.purchaseReceipts.selectOrderPrompt') : null} onRetry={error && selectedOrder ? () => void loadReceipts() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.purchasing.manage} /> : null}

      {selectedOrder && (
        <PageBody>
          <Suspense fallback={<LoadingFallback />}>
            <PurchaseReceiptDataGrid rows={rows} isLoading={isLoading} onPost={(row) => { setActionError(null); setPendingAction({ type: 'post', row }) }} onDelete={(row) => { setActionError(null); setPendingAction({ type: 'delete', row }) }} canManage={canManage} />
          </Suspense>
        </PageBody>
      )}

      <VxConfirmActionDialog
        open={Boolean(pendingAction)}
        title={t(pendingAction?.type === 'post' ? 'pages.purchaseReceipts.actions.postTitle' : 'pages.purchaseReceipts.actions.deleteTitle')}
        targetName={pendingAction?.row.receiptNumber ?? ''}
        consequence={t(pendingAction?.type === 'post' ? 'pages.purchaseReceipts.actions.postConsequence' : 'pages.purchaseReceipts.actions.deleteConsequence')}
        confirmLabel={t(pendingAction?.type === 'post' ? 'pages.purchaseReceipts.actions.postConfirm' : 'pages.purchaseReceipts.actions.deleteConfirm')}
        pendingLabel={t(pendingAction?.type === 'post' ? 'pages.purchaseReceipts.actions.posting' : 'pages.purchaseReceipts.actions.deleting')}
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
          <CreatePurchaseReceiptDialog
            open={isCreateOpen}
            purchaseOrderId={selectedOrder.id}
            warehouses={warehouses}
            onClose={() => setIsCreateOpen(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
    </VxStack>
  )
}
