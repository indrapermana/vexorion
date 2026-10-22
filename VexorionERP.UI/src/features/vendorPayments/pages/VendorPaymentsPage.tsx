import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, PaidRoundedIcon, ReceiptLongRoundedIcon, ScheduleRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxStack } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useSuppliersLookup } from '../../../hooks/useLookups'
import { ApiError, getPurchaseInvoices, getVendorPayments } from '../../../lib/api'
import DocumentsPanel from '../../../components/DocumentsPanel'
import type { PurchaseInvoiceListItemResponse, VendorPaymentDetailsResponse, VendorPaymentListItemResponse } from '../../../types/api'
import type { VendorPaymentFormValues, VendorPaymentGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'

const VendorPaymentDataGrid = lazy(() => import('../components/VendorPaymentDataGrid'))
const VendorPaymentEditorDialog = lazy(() => import('../components/VendorPaymentEditorDialog'))

function VendorPaymentSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.vendorPayments.loadingTools')} />
  )
}

type SourceState = Partial<VendorPaymentFormValues> & {
  purchaseInvoiceId?: string | null
}

export default function VendorPaymentsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.purchasing.manage) ?? false
  const canViewSuppliers = user?.permissions.includes(Permissions.suppliers.view) ?? false
  const { items: suppliers, error: suppliersError, reload: reloadSuppliers } = useSuppliersLookup(isAuthenticated && canViewSuppliers)
  const location = useLocation()
  const navigate = useNavigate()
  const sourceState = (location.state as SourceState | null) ?? null

  const [payments, setPayments] = useState<VendorPaymentListItemResponse[]>([])
  const [outstandingInvoices, setOutstandingInvoices] = useState<PurchaseInvoiceListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
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

    if (!canManage) {
      void navigate(location.pathname, { replace: true, state: null })
      return
    }

    setEditorDefaults(sourceState)
    setIsEditorOpen(true)
    void navigate(location.pathname, { replace: true, state: null })
  }, [canManage, location.pathname, navigate, sourceState])

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
    return <VxAlert severity="info">{t('pages.vendorPayments.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.vendorPayments')}
        description={t('pages.vendorPayments.description')}
        primaryAction={canManage ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog} disabled={!outstandingInvoices.length}>
            {t('pages.vendorPayments.recordPayment')}
          </VxButton>
        ) : null}
        metrics={(
          <>
            <PageMetric icon={<PaidRoundedIcon fontSize="small" />} label={t('pages.vendorPayments.metrics.payments')} value={payments.length} />
            <PageMetric icon={<ScheduleRoundedIcon fontSize="small" />} label={t('pages.vendorPayments.metrics.outstandingInvoices')} value={outstandingInvoices.length} />
            <PageMetric icon={<ReceiptLongRoundedIcon fontSize="small" />} label={t('pages.vendorPayments.metrics.openBalance')} value={`$${outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0).toFixed(2)}`} />
          </>
        )}
      />

      {suppliersError ? <VxAlert severity="warning">{suppliersError}</VxAlert> : null}
      <PageFeedback
        error={error}
        success={feedback}
        info={!outstandingInvoices.length ? t('pages.vendorPayments.noOutstandingInvoices') : null}
        onRetry={error ? () => void loadData() : undefined}
      />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.purchasing.manage} /> : null}

      <PageBody>
        <Suspense fallback={<VendorPaymentSurfaceFallback />}>
          <VendorPaymentDataGrid rows={rows} isLoading={isLoading} onSelectPayment={setSelectedPaymentId} />
        </Suspense>
      </PageBody>

      <DocumentsPanel sourceType="VendorPaymentReceipt" sourceEntityId={selectedPaymentId} />

      {canManage && isEditorOpen ? (
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
    </VxStack>
  )
}
