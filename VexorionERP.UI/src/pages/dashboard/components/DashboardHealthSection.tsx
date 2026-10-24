import { VxBox, VxGrid, VxLinearProgress, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'

type DashboardHealthSectionProps = {
  t: TFunction
  receivablesHealthPercent: number
  payablesHealthPercent: number
  totalReceivables: number
  totalPayables: number
}

export default function DashboardHealthSection({
  t,
  receivablesHealthPercent,
  payablesHealthPercent,
  totalReceivables,
  totalPayables,
}: DashboardHealthSectionProps) {
  const { formatMoney } = useCurrency()
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxTypography component="h2" variant="h6" sx={{ mb: 2.5 }}>{t('dashboard.health.receivables')}</VxTypography>
          <VxStack spacing={2}>
            <VxBox>
              <VxBox sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <VxTypography variant="body2" color="text.secondary">{t('dashboard.health.current')}</VxTypography>
                <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{totalReceivables > 0 ? `${receivablesHealthPercent}%` : t('dashboard.quickStats.notApplicable')}</VxTypography>
              </VxBox>
              {totalReceivables > 0 ? <VxLinearProgress aria-label={t('dashboard.health.receivables')} variant="determinate" value={receivablesHealthPercent} sx={{ height: 8, borderRadius: 4 }} /> : null}
            </VxBox>
            <VxBox sx={{ pt: 1 }}>
              <VxTypography variant="caption" color="text.secondary">{t('dashboard.health.totalReceivables')}</VxTypography>
              <VxTypography component="p" variant="h6">{formatMoney(totalReceivables)}</VxTypography>
            </VxBox>
          </VxStack>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxTypography component="h2" variant="h6" sx={{ mb: 2.5 }}>{t('dashboard.health.payables')}</VxTypography>
          <VxStack spacing={2}>
            <VxBox>
              <VxBox sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <VxTypography variant="body2" color="text.secondary">{t('dashboard.health.current')}</VxTypography>
                <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{totalPayables > 0 ? `${payablesHealthPercent}%` : t('dashboard.quickStats.notApplicable')}</VxTypography>
              </VxBox>
              {totalPayables > 0 ? <VxLinearProgress aria-label={t('dashboard.health.payables')} variant="determinate" value={payablesHealthPercent} sx={{ height: 8, borderRadius: 4 }} /> : null}
            </VxBox>
            <VxBox sx={{ pt: 1 }}>
              <VxTypography variant="caption" color="text.secondary">{t('dashboard.health.totalPayables')}</VxTypography>
              <VxTypography component="p" variant="h6">{formatMoney(totalPayables)}</VxTypography>
            </VxBox>
          </VxStack>
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
