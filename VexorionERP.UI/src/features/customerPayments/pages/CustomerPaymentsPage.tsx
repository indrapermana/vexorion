import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, PaidRoundedIcon, ReceiptLongRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxStack } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import { useCustomersLookup } from '../../../hooks/useLookups'
import { ApiError, getCustomerPayments, getSalesInvoices } from '../../../lib/api'
import DocumentsPanel from '../../../components/DocumentsPanel'
import type { CustomerPaymentDetailsResponse, CustomerPaymentListItemResponse, SalesInvoiceListItemResponse } from '../../../types/api'
import type { CustomerPaymentFormValues, CustomerPaymentGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'

const CustomerPaymentDataGrid = lazy(() => import('../components/CustomerPaymentDataGrid'))
const CustomerPaymentEditorDialog = lazy(() => import('../components/CustomerPaymentEditorDialog'))

function CustomerPaymentSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.customerPayments.loadingTools')} />
  )
}

type SourceState = Partial<CustomerPaymentFormValues> & {
  salesInvoiceId?: string | null
}

export default function CustomerPaymentsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.sales.manage) ?? false
  const canViewCustomers = user?.permissions.includes(Permissions.customers.view) ?? false
  const { items: customers, error: customersError, reload: reloadCustomers } = useCustomersLookup(isAuthenticated && canViewCustomers)
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

    if (!canManage) {
      void navigate(location.pathname, { replace: true, state: null })
      return
    }

    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [canManage, location.pathname, navigate, sourceState])

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
      <PageHeader
        title={t('nav.routeTitles.customerPayments')}
        description={t('pages.customerPayments.description')}
        primaryAction={canManage ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog} disabled={!outstandingInvoices.length}>
            {t('pages.customerPayments.recordPayment')}
          </VxButton>
        ) : null}
        metrics={(
          <>
            <PageMetric icon={<PaidRoundedIcon fontSize="small" />} label={t('pages.customerPayments.metrics.payments')} value={payments.length} />
            <PageMetric icon={<ScheduleRoundedIcon fontSize="small" />} label={t('pages.customerPayments.metrics.outstandingInvoices')} value={outstandingInvoices.length} />
            <PageMetric icon={<ReceiptLongRoundedIcon fontSize="small" />} label={t('pages.customerPayments.metrics.openBalance')} value={formatMoney(outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0))} />
          </>
        )}
      />

      {customersError ? <VxAlert severity="warning">{customersError}</VxAlert> : null}
      <PageFeedback
        error={error}
        success={feedback}
        info={!outstandingInvoices.length ? t('pages.customerPayments.noOutstandingInvoices') : null}
        onRetry={error ? () => void loadData() : undefined}
      />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.sales.manage} /> : null}

      <PageBody>
        <Suspense fallback={<CustomerPaymentSurfaceFallback />}>
          <CustomerPaymentDataGrid rows={rows} isLoading={isLoading} onSelectPayment={setSelectedPaymentId} />
        </Suspense>
      </PageBody>

      <DocumentsPanel sourceType="CustomerPaymentReceipt" sourceEntityId={selectedPaymentId} />

      {canManage && isEditorOpen ? (
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
