import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deletePurchaseReceipt, getPurchaseOrders, getPurchaseReceiptsForOrder, postPurchaseReceipt } from '../../../lib/api'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import type { PurchaseOrderListItemResponse, PurchaseReceiptDetailsResponse, PurchaseReceiptListItemResponse } from '../../../types/api'
import type { PurchaseReceiptGridRow } from '../../../types/ui'

const PurchaseReceiptDataGrid = lazy(() => import('../components/PurchaseReceiptDataGrid'))
const CreatePurchaseReceiptDialog = lazy(() => import('../components/CreatePurchaseReceiptDialog'))

function LoadingFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.purchaseReceipts.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = { sourcePurchaseOrderId?: string | null; purchaseOrderNumber?: string | null }

export default function PurchaseReceiptsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null

  const { items: warehouses } = useWarehousesLookup(isAuthenticated)

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItemResponse[]>([])
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderListItemResponse | null>(null)
  const [receipts, setReceipts] = useState<PurchaseReceiptListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

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
    try {
      await postPurchaseReceipt(row.id)
      setFeedback(`Receipt ${row.receiptNumber} posted successfully.`)
      await loadReceipts()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to post receipt.')
    }
  }

  const handleDelete = async (row: PurchaseReceiptGridRow) => {
    setFeedback(null)
    try {
      await deletePurchaseReceipt(row.id)
      setFeedback(`Receipt ${row.receiptNumber} deleted.`)
      await loadReceipts()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to delete receipt.')
    }
  }

  const handleSaved = async (_receipt: PurchaseReceiptDetailsResponse) => {
    setIsCreateOpen(false)
    await loadReceipts()
  }

  const rows: PurchaseReceiptGridRow[] = receipts

  if (!isAuthenticated) {
    return (
      <Alert severity="info">{t('pages.purchaseReceipts.signInRequired')}</Alert>
    )
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LocalShippingRoundedIcon color="primary" />
          <Typography variant="h6">{t('nav.routeTitles.purchaseReceipts')}</Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          disabled={!selectedOrder}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('pages.purchaseReceipts.newButton')}
        </Button>
      </Stack>

      <Autocomplete
        options={purchaseOrders}
        value={selectedOrder}
        onChange={(_, value) => {
          setSelectedOrder(value)
          setFeedback(null)
          setError(null)
        }}
        getOptionLabel={(o) => o.orderNumber}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField {...params} label={t('pages.purchaseReceipts.filterByOrder')} size="small" />
        )}
        sx={{ maxWidth: 320 }}
      />

      {!selectedOrder && (
        <Alert severity="info">{t('pages.purchaseReceipts.selectOrderPrompt')}</Alert>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {feedback && <Alert severity="success" onClose={() => setFeedback(null)}>{feedback}</Alert>}

      {selectedOrder && (
        <Suspense fallback={<LoadingFallback />}>
          <PurchaseReceiptDataGrid
            rows={rows}
            isLoading={isLoading}
            onPost={handlePost}
            onDelete={handleDelete}
          />
        </Suspense>
      )}

      {isCreateOpen && selectedOrder && (
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
    </Stack>
  )
}
