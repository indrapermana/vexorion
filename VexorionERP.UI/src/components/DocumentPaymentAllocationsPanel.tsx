import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxPaper, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../app/CurrencyContext'
import { ApiError, getCustomerPaymentsForInvoice, getVendorPaymentsForInvoice } from '../lib/api'

type DocumentPaymentAllocationsPanelProps = {
  kind: 'customer' | 'vendor'
  invoiceId: string | null
}

type PaymentAllocation = {
  id: string
  date: string
  reference: string
  method: string
  amount: number
}

export default function DocumentPaymentAllocationsPanel({ kind, invoiceId }: DocumentPaymentAllocationsPanelProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadAllocations = useCallback(async () => {
    if (!invoiceId) {
      setAllocations((current) => current.length > 0 ? [] : current)
      return
    }

    setAllocations([])
    setIsLoading(true)
    setError(null)
    try {
      const related: PaymentAllocation[] = kind === 'customer'
        ? (await getCustomerPaymentsForInvoice(invoiceId)).map((payment) => ({
          id: payment.id,
          date: payment.paymentDate,
          reference: payment.referenceNumber ?? '-',
          method: payment.paymentMethod ?? '-',
          amount: payment.amount,
        }))
        : (await getVendorPaymentsForInvoice(invoiceId)).map((payment) => ({
          id: payment.id,
          date: payment.paymentDate,
          reference: payment.referenceNumber ?? '-',
          method: payment.paymentMethod ?? '-',
          amount: payment.amount,
        }))
      setAllocations(related)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('orderWorkflow.review.allocationsLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, kind, t])

  useEffect(() => {
    void loadAllocations()
  }, [loadAllocations])

  if (!invoiceId) return null

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxTypography component="h2" variant="h6" sx={{ mb: 1.5 }}>{t('orderWorkflow.review.allocationsTitle')}</VxTypography>
      {error ? <VxAlert severity="error" sx={{ mb: 1.5 }}>{error}</VxAlert> : null}
      {isLoading ? <VxTypography color="text.secondary">{t('orderWorkflow.review.loading')}</VxTypography> : null}
      {!isLoading && !error && allocations.length === 0 ? <VxTypography color="text.secondary">{t('orderWorkflow.review.noAllocations')}</VxTypography> : null}
      {allocations.length > 0 ? (
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('orderWorkflow.review.paymentDate')}</VxTableCell>
              <VxTableCell>{t('orderWorkflow.review.referenceNumber')}</VxTableCell>
              <VxTableCell>{t('orderWorkflow.review.paymentMethod')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.review.amount')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {allocations.map((allocation) => (
              <VxTableRow key={allocation.id}>
                <VxTableCell>{allocation.date}</VxTableCell>
                <VxTableCell>{allocation.reference}</VxTableCell>
                <VxTableCell>{allocation.method}</VxTableCell>
                <VxTableCell align="right">{formatMoney(allocation.amount)}</VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      ) : null}
    </VxPaper>
  )
}