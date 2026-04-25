import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deletePurchaseReceipt, getPurchaseReceiptsForOrder, postPurchaseReceipt } from '../../../lib/api'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import type { PurchaseReceiptDetailsResponse, PurchaseReceiptListItemResponse } from '../../../types/api'
import type { PurchaseReceiptGridRow } from '../../../types/ui'

const PurchaseReceiptDataGrid = lazy(() => import('../components/PurchaseReceiptDataGrid'))
const CreatePurchaseReceiptDialog = lazy(() => import('../components/CreatePurchaseReceiptDialog'))

function LoadingFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

type SourceState = { sourcePurchaseOrderId?: string | null; purchaseOrderNumber?: string | null }

export default function PurchaseReceiptsPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null
  const purchaseOrderId = sourceState?.sourcePurchaseOrderId ?? null
  const purchaseOrderNumber = sourceState?.purchaseOrderNumber ?? null

  const { items: warehouses } = useWarehousesLookup(isAuthenticated)

  const [receipts, setReceipts] = useState<PurchaseReceiptListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadReceipts = useCallback(async () => {
    if (!isAuthenticated || !purchaseOrderId) {
      setReceipts([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setReceipts(await getPurchaseReceiptsForOrder(purchaseOrderId))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to load purchase receipts.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, purchaseOrderId])

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
      <Alert severity="info">Sign in to view purchase receipts.</Alert>
    )
  }

  if (!purchaseOrderId) {
    return (
      <Alert severity="warning">
        Navigate here from a purchase order to view its receipts.
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LocalShippingRoundedIcon color="primary" />
          <Typography variant="h6">
            Purchase Receipts
            {purchaseOrderNumber ? ` — ${purchaseOrderNumber}` : ''}
          </Typography>
        </Stack>
        <Button variant="contained" size="small" onClick={() => setIsCreateOpen(true)}>
          New Receipt
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {feedback && <Alert severity="success" onClose={() => setFeedback(null)}>{feedback}</Alert>}

      <Suspense fallback={<LoadingFallback />}>
        <PurchaseReceiptDataGrid
          rows={rows}
          isLoading={isLoading}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      </Suspense>

      {isCreateOpen && (
        <Suspense fallback={<LoadingFallback />}>
          <CreatePurchaseReceiptDialog
            open={isCreateOpen}
            purchaseOrderId={purchaseOrderId}
            warehouses={warehouses}
            onClose={() => setIsCreateOpen(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
    </Stack>
  )
}
