import { InsightsRoundedIcon, Inventory2RoundedIcon, PaidRoundedIcon } from '@vexorion/ui'
import { VxBox, VxGrid, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { FinanceDashboardSnapshotResponse } from '../../../types/api'

type DashboardKpiCardsProps = {
  t: TFunction
  snapshot: FinanceDashboardSnapshotResponse | null
  periodDays: number
}

export default function DashboardKpiCards({ t, snapshot, periodDays }: DashboardKpiCardsProps) {
  const { formatMoney } = useCurrency()
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, sm: 6, md: 3 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(108, 92, 231, 0.08)' }}>
          <VxStack spacing={1.5}>
            <VxBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <VxBox>
                <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.openReceivables')}
                </VxTypography>
                <VxTypography component="p" variant="h5" sx={{ mt: 0.5 }}>
                  {formatMoney(snapshot?.receivablesOpen ?? 0)}
                </VxTypography>
              </VxBox>
              <PaidRoundedIcon sx={{ color: 'primary.main', fontSize: 28, opacity: 0.7 }} />
            </VxBox>
            {(snapshot?.receivablesOverdue ?? 0) > 0 && (
              <VxBox sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VxTypography variant="caption" color="warning.main">
                  {t('dashboard.summary.overdueAmount', { amount: formatMoney(snapshot?.receivablesOverdue ?? 0) })}
                </VxTypography>
              </VxBox>
            )}
            <VxTypography variant="caption" color="text.secondary">{t('dashboard.definitions.receivables')}</VxTypography>
          </VxStack>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, sm: 6, md: 3 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(160, 107, 213, 0.08)' }}>
          <VxStack spacing={1.5}>
            <VxBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <VxBox>
                <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.openPayables')}
                </VxTypography>
                <VxTypography component="p" variant="h5" sx={{ mt: 0.5 }}>
                  {formatMoney(snapshot?.payablesOpen ?? 0)}
                </VxTypography>
              </VxBox>
              <Inventory2RoundedIcon sx={{ color: 'secondary.main', fontSize: 28, opacity: 0.7 }} />
            </VxBox>
            {(snapshot?.payablesOverdue ?? 0) > 0 && (
              <VxBox sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VxTypography variant="caption" color="warning.main">
                  {t('dashboard.summary.overdueAmount', { amount: formatMoney(snapshot?.payablesOverdue ?? 0) })}
                </VxTypography>
              </VxBox>
            )}
            <VxTypography variant="caption" color="text.secondary">{t('dashboard.definitions.payables')}</VxTypography>
          </VxStack>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, sm: 6, md: 3 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(0, 170, 68, 0.08)' }}>
          <VxStack spacing={1.5}>
            <VxBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <VxBox>
                <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.revenuePeriod', { days: periodDays })}
                </VxTypography>
                <VxTypography component="p" variant="h5" sx={{ mt: 0.5 }}>
                  {formatMoney(snapshot?.revenueInPeriod ?? 0)}
                </VxTypography>
              </VxBox>
              <InsightsRoundedIcon sx={{ color: 'success.main', fontSize: 28, opacity: 0.7 }} />
            </VxBox>
            <VxTypography variant="caption" color="text.secondary">{t('dashboard.definitions.invoicedSales')}</VxTypography>
          </VxStack>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, sm: 6, md: 3 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(255, 153, 0, 0.08)' }}>
          <VxStack spacing={1.5}>
            <VxBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <VxBox>
                <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.netCashFlow')}
                </VxTypography>
                <VxTypography component="p" variant="h5" sx={{ mt: 0.5 }}>
                  {formatMoney(snapshot?.netCashInPeriod ?? 0)}
                </VxTypography>
              </VxBox>
              <PaidRoundedIcon sx={{ color: 'warning.main', fontSize: 28, opacity: 0.7 }} />
            </VxBox>
            <VxBox sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VxTypography variant="caption" color={(snapshot?.netCashInPeriod ?? 0) === 0 ? 'text.secondary' : (snapshot?.netCashInPeriod ?? 0) > 0 ? 'success.main' : 'error.main'}>
                {(snapshot?.netCashInPeriod ?? 0) === 0 ? t('dashboard.summary.balancedFlow') : (snapshot?.netCashInPeriod ?? 0) > 0 ? t('dashboard.summary.positiveFlow') : t('dashboard.summary.negativeFlow')}
              </VxTypography>
            </VxBox>
            <VxTypography variant="caption" color="text.secondary">{t('dashboard.definitions.netCash')}</VxTypography>
          </VxStack>
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
