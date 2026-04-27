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
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteSalesShipment, getSalesShipmentsForOrder, postSalesShipment } from '../../../lib/api'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import type { SalesShipmentDetailsResponse, SalesShipmentListItemResponse } from '../../../types/api'
import type { SalesShipmentGridRow } from '../../../types/ui'

const SalesShipmentDataGrid = lazy(() => import('../components/SalesShipmentDataGrid'))
const CreateSalesShipmentDialog = lazy(() => import('../components/CreateSalesShipmentDialog'))

function LoadingFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.salesShipments.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = { sourceSalesOrderId?: string | null; salesOrderNumber?: string | null }

export default function SalesShipmentsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const sourceState = (location.state as SourceState | null) ?? null
  const salesOrderId = sourceState?.sourceSalesOrderId ?? null
  const salesOrderNumber = sourceState?.salesOrderNumber ?? null

  const { items: warehouses } = useWarehousesLookup(isAuthenticated)

  const [shipments, setShipments] = useState<SalesShipmentListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadShipments = useCallback(async () => {
    if (!isAuthenticated || !salesOrderId) {
      setShipments([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setShipments(await getSalesShipmentsForOrder(salesOrderId))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to load sales shipments.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, salesOrderId])

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

  const handleSaved = async (_shipment: SalesShipmentDetailsResponse) => {
    setIsCreateOpen(false)
    await loadShipments()
  }

  const rows: SalesShipmentGridRow[] = shipments

  if (!isAuthenticated) {
    return <Alert severity="info">{t('pages.salesShipments.signInRequired')}</Alert>
  }

  if (!salesOrderId) {
    return (
      <Alert severity="warning">
        {t('pages.salesShipments.navigateFromOrder')}
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LocalShippingRoundedIcon color="primary" />
          <Typography variant="h6">
            {t('nav.routeTitles.salesShipments')}
            {salesOrderNumber ? ` — ${salesOrderNumber}` : ''}
          </Typography>
        </Stack>
        <Button variant="contained" size="small" onClick={() => setIsCreateOpen(true)}>
          {t('pages.salesShipments.newButton')}
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {feedback && <Alert severity="success" onClose={() => setFeedback(null)}>{feedback}</Alert>}

      <Suspense fallback={<LoadingFallback />}>
        <SalesShipmentDataGrid
          rows={rows}
          isLoading={isLoading}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      </Suspense>

      {isCreateOpen && (
        <Suspense fallback={<LoadingFallback />}>
          <CreateSalesShipmentDialog
            open={isCreateOpen}
            salesOrderId={salesOrderId}
            warehouses={warehouses}
            onClose={() => setIsCreateOpen(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
    </Stack>
  )
}
