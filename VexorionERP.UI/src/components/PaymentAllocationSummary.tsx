import { VxAlert, VxBox, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { getPaymentAllocationPreview } from '../types/ui/paymentAllocations'

type PaymentAllocationSummaryProps = {
  invoiceBalance: number
  paymentAmount: number
  currencyCode: string
}

export default function PaymentAllocationSummary({ invoiceBalance, paymentAmount, currencyCode }: PaymentAllocationSummaryProps) {
  const { t, i18n } = useTranslation()
  const summary = getPaymentAllocationPreview(invoiceBalance, paymentAmount)
  const formatAmount = (value: number) => {
    try {
      return new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'currency', currency: currencyCode }).format(value)
    } catch {
      return `${currencyCode} ${value.toFixed(2)}`
    }
  }

  const amounts = [
    ['invoiceBalance', summary.invoiceBalance],
    ['paymentAmount', summary.paymentAmount],
    ['allocatedAmount', summary.allocatedAmount],
    ['unappliedAmount', summary.unappliedAmount],
    ['remainingBalance', summary.remainingBalance],
  ] as const

  return (
    <VxAlert severity={summary.unappliedAmount > 0 ? 'warning' : 'info'}>
      <VxStack spacing={1} sx={{ width: '100%' }}>
        <VxTypography component="h3" variant="subtitle2">{t('orderWorkflow.paymentAllocation.title')}</VxTypography>
        <VxBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          {amounts.map(([key, value]) => (
            <VxStack key={key} spacing={0.25}>
              <VxTypography variant="caption" color="text.secondary">{t(`orderWorkflow.paymentAllocation.${key}`)}</VxTypography>
              <VxTypography variant="body2">{formatAmount(value)}</VxTypography>
            </VxStack>
          ))}
        </VxBox>
        {summary.unappliedAmount > 0 ? (
          <VxTypography variant="body2">{t('orderWorkflow.paymentAllocation.exceedsBalance')}</VxTypography>
        ) : null}
      </VxStack>
    </VxAlert>
  )
}