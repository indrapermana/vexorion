import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useSuppliersLookup } from '../../../hooks/useLookups'
import { ApiError, getPurchaseInvoices, getVendorPayments } from '../../../lib/api'
import type { PurchaseInvoiceListItemResponse, VendorPaymentDetailsResponse, VendorPaymentListItemResponse } from '../../../types/api'
import type { VendorPaymentFormValues, VendorPaymentGridRow } from '../../../types/ui'

const VendorPaymentDataGrid = lazy(() => import('../components/VendorPaymentDataGrid'))
const VendorPaymentEditorDialog = lazy(() => import('../components/VendorPaymentEditorDialog'))

function VendorPaymentSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.vendorPayments.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = Partial<VendorPaymentFormValues> & {
  purchaseInvoiceId?: string | null
}

export default function VendorPaymentsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { items: suppliers, error: suppliersError, reload: reloadSuppliers } = useSuppliersLookup(isAuthenticated)
  const location = useLocation()
  const navigate = useNavigate()
  const sourceState = (location.state as SourceState | null) ?? null

  const [payments, setPayments] = useState<VendorPaymentListItemResponse[]>([])
  const [outstandingInvoices, setOutstandingInvoices] = useState<PurchaseInvoiceListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorDefaults, setEditorDefaults] = useState<Partial<VendorPaymentFormValues> | undefined>(undefined)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setPayments([])
      setOutstandingInvoices([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [paymentsResult, invoicesResult] = await Promise.all([
        getVendorPayments(),
        getPurchaseInvoices(true),
      ])
      setPayments(paymentsResult)
      setOutstandingInvoices(invoicesResult)
      await reloadSuppliers()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load vendor payments.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadSuppliers])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!sourceState?.purchaseInvoiceId) {
      return
    }

    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, navigate, sourceState])

  const supplierNameById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers],
  )

  const invoiceNumberById = useMemo(
    () => new Map(outstandingInvoices.map((invoice) => [invoice.id, invoice.invoiceNumber])),
    [outstandingInvoices],
  )

  const rows = useMemo<VendorPaymentGridRow[]>(
    () => payments.map((payment) => ({
      ...payment,
      supplierName: supplierNameById.get(payment.supplierId),
      invoiceNumber: invoiceNumberById.get(payment.purchaseInvoiceId),
    })),
    [invoiceNumberById, payments, supplierNameById],
  )

  const openCreateDialog = () => {
    setFeedback(null)
    setEditorDefaults(undefined)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setEditorDefaults(undefined)
  }

  const handleSaved = async (payment: VendorPaymentDetailsResponse) => {
    setFeedback(`Payment ${payment.referenceNumber ?? payment.id.slice(0, 8)} recorded.`)
    handleEditorClose()
    await loadData()
  }

  if (!isAuthenticated) {
    return <Alert severity="info">{t('pages.vendorPayments.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.vendorPayments')}</Typography>
            <Typography color="text.secondary">{t('pages.vendorPayments.description')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog} disabled={!outstandingInvoices.length}>
              {t('pages.vendorPayments.recordPayment')}
            </Button>
            <Paper elevation={0} className="products-metric-card">
              <PaidRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.vendorPayments.metrics.payments')}</Typography>
                <Typography variant="h6">{payments.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <ScheduleRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.vendorPayments.metrics.outstandingInvoices')}</Typography>
                <Typography variant="h6">{outstandingInvoices.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <ReceiptLongRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.vendorPayments.metrics.openBalance')}</Typography>
                <Typography variant="h6">${outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0).toFixed(2)}</Typography>
              </Box>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {suppliersError ? <Alert severity="warning">{suppliersError}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}
      {!outstandingInvoices.length ? <Alert severity="info">{t('pages.vendorPayments.noOutstandingInvoices')}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<VendorPaymentSurfaceFallback />}>
          <VendorPaymentDataGrid rows={rows} isLoading={isLoading} />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<VendorPaymentSurfaceFallback />}>
          <VendorPaymentEditorDialog
            open={isEditorOpen}
            suppliers={suppliers}
            outstandingInvoices={outstandingInvoices}
            initialValues={editorDefaults}
            onClose={handleEditorClose}
            onSaved={(payment) => void handleSaved(payment)}
          />
        </Suspense>
      ) : null}
    </Stack>
  )
}
