import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, PaidRoundedIcon, ReceiptLongRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import { useCustomersLookup } from '../../../hooks/useLookups'
import { ApiError, getCustomerPayments, getSalesInvoices } from '../../../lib/api'
import DocumentsPanel from '../../../components/DocumentsPanel'
import type { CustomerPaymentDetailsResponse, CustomerPaymentListItemResponse, SalesInvoiceListItemResponse } from '../../../types/api'
import type { CustomerPaymentFormValues, CustomerPaymentGridRow } from '../../../types/ui'

const CustomerPaymentDataGrid = lazy(() => import('../components/CustomerPaymentDataGrid'))
const CustomerPaymentEditorDialog = lazy(() => import('../components/CustomerPaymentEditorDialog'))

function CustomerPaymentSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxCircularProgress size={28} />
        <VxTypography color="text.secondary">{t('pages.customerPayments.loadingTools')}</VxTypography>
      </VxStack>
    </VxBox>
  )
}

type SourceState = Partial<CustomerPaymentFormValues> & {
  salesInvoiceId?: string | null
}

export default function CustomerPaymentsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
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
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
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
    return <VxAlert severity="info">{t('pages.customerPayments.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.customerPayments')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.customerPayments.description')}</VxTypography>
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog} disabled={!outstandingInvoices.length}>
              {t('pages.customerPayments.recordPayment')}
            </VxButton>
            <VxPaper elevation={0} className="products-metric-card">
              <PaidRoundedIcon fontSize="small" />
              <VxBox>
                <VxTypography variant="body2" color="text.secondary">{t('pages.customerPayments.metrics.payments')}</VxTypography>
                <VxTypography variant="h6">{payments.length}</VxTypography>
              </VxBox>
            </VxPaper>
            <VxPaper elevation={0} className="products-metric-card">
              <ScheduleRoundedIcon fontSize="small" />
              <VxBox>
                <VxTypography variant="body2" color="text.secondary">{t('pages.customerPayments.metrics.outstandingInvoices')}</VxTypography>
                <VxTypography variant="h6">{outstandingInvoices.length}</VxTypography>
              </VxBox>
            </VxPaper>
            <VxPaper elevation={0} className="products-metric-card">
              <ReceiptLongRoundedIcon fontSize="small" />
              <VxBox>
                <VxTypography variant="body2" color="text.secondary">{t('pages.customerPayments.metrics.openBalance')}</VxTypography>
                <VxTypography variant="h6">{formatMoney(outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0))}</VxTypography>
              </VxBox>
            </VxPaper>
          </VxStack>
        </VxStack>
      </VxPaper>

      {customersError ? <VxAlert severity="warning">{customersError}</VxAlert> : null}
      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}
      {!outstandingInvoices.length ? <VxAlert severity="info">{t('pages.customerPayments.noOutstandingInvoices')}</VxAlert> : null}

      <VxPaper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<CustomerPaymentSurfaceFallback />}>
          <CustomerPaymentDataGrid rows={rows} isLoading={isLoading} onSelectPayment={setSelectedPaymentId} />
        </Suspense>
      </VxPaper>

      <DocumentsPanel sourceType="CustomerPaymentReceipt" sourceEntityId={selectedPaymentId} />

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
    </VxStack>
  )
}
