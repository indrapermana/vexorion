import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCustomersLookup } from '../../../hooks/useLookups'
import { ApiError, getCustomerPayments, getSalesInvoices } from '../../../lib/api'
import type { CustomerPaymentDetailsResponse, CustomerPaymentListItemResponse, SalesInvoiceListItemResponse } from '../../../types/api'
import type { CustomerPaymentFormValues, CustomerPaymentGridRow } from '../../../types/ui'

const CustomerPaymentDataGrid = lazy(() => import('../components/CustomerPaymentDataGrid'))
const CustomerPaymentEditorDialog = lazy(() => import('../components/CustomerPaymentEditorDialog'))

function CustomerPaymentSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading customer payment tools...</Typography>
      </Stack>
    </Box>
  )
}

type SourceState = Partial<CustomerPaymentFormValues> & {
  salesInvoiceId?: string | null
}

export default function CustomerPaymentsPage() {
  const { isAuthenticated } = useAuth()
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated)
  const location = useLocation()
  const navigate = useNavigate()
  const sourceState = (location.state as SourceState | null) ?? null

  const [payments, setPayments] = useState<CustomerPaymentListItemResponse[]>([])
  const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoiceListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorDefaults, setEditorDefaults] = useState<Partial<CustomerPaymentFormValues> | undefined>(undefined)

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
        getCustomerPayments(),
        getSalesInvoices(true),
      ])
      setPayments(paymentsResult)
      setOutstandingInvoices(invoicesResult)
      await reloadCustomers()
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load customer payments.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadCustomers])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!sourceState?.salesInvoiceId) {
      return
    }

    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, navigate, sourceState])

  const customerNameById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  )

  const invoiceNumberById = useMemo(
    () => new Map(outstandingInvoices.map((invoice) => [invoice.id, invoice.invoiceNumber])),
    [outstandingInvoices],
  )

  const rows = useMemo<CustomerPaymentGridRow[]>(
    () => payments.map((payment) => ({
      ...payment,
      customerName: customerNameById.get(payment.customerId),
      invoiceNumber: invoiceNumberById.get(payment.salesInvoiceId),
    })),
    [customerNameById, invoiceNumberById, payments],
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

  const handleSaved = async (payment: CustomerPaymentDetailsResponse) => {
    setFeedback(`Payment ${payment.referenceNumber ?? payment.id.slice(0, 8)} recorded.`)
    handleEditorClose()
    await loadData()
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Customer payments require an authenticated user with sales permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Customer Payments</Typography>
            <Typography color="text.secondary">Cash application entries from `/api/customer-payments`, linked to outstanding sales invoices.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog} disabled={!outstandingInvoices.length}>
              Record payment
            </Button>
            <Paper elevation={0} className="products-metric-card">
              <PaidRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Payments</Typography>
                <Typography variant="h6">{payments.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <ScheduleRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Outstanding invoices</Typography>
                <Typography variant="h6">{outstandingInvoices.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <ReceiptLongRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Open balance</Typography>
                <Typography variant="h6">${outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0).toFixed(2)}</Typography>
              </Box>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {customersError ? <Alert severity="warning">{customersError}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}
      {!outstandingInvoices.length ? <Alert severity="info">No outstanding sales invoices are currently available for payment allocation.</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<CustomerPaymentSurfaceFallback />}>
          <CustomerPaymentDataGrid rows={rows} isLoading={isLoading} />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<CustomerPaymentSurfaceFallback />}>
          <CustomerPaymentEditorDialog
            open={isEditorOpen}
            customers={customers}
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
