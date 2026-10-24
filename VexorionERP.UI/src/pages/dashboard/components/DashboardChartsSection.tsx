import { VxBox, VxGrid, VxPaper, VxTypography } from '@vexorion/ui'
import { VxBarChart } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { BalancePoint } from '../types'

type DashboardChartsSectionProps = {
  t: TFunction
  cashIn: number
  cashOut: number
  periodDays: number
  receivablesVsPayablesData: BalancePoint[]
}

export default function DashboardChartsSection({
  t,
  cashIn,
  cashOut,
  periodDays,
  receivablesVsPayablesData,
}: DashboardChartsSectionProps) {
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <VxTypography component="h3" variant="subtitle1" sx={{ mb: 2 }}>{t('dashboard.charts.cashFlowPeriod', { days: periodDays })}</VxTypography>
          <VxBox sx={{ width: '100%', height: 300 }}>
            <VxBarChart
              series={[{ data: [cashIn, cashOut], label: t('dashboard.charts.cashFlowPeriod', { days: periodDays }) }]}
              xAxis={[{ data: [t('dashboard.cashRows.inflow'), t('dashboard.cashRows.outflow')], scaleType: 'band' }]}
              margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
            />
          </VxBox>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <VxTypography component="h3" variant="subtitle1" sx={{ mb: 2 }}>{t('dashboard.charts.receivablesVsPayables')}</VxTypography>
          <VxBox sx={{ width: '100%', height: 300 }}>
            <VxBarChart
              dataset={receivablesVsPayablesData}
              xAxis={[{ scaleType: 'band', dataKey: 'name' }]}
              series={[
                { dataKey: 'open', label: t('dashboard.health.current') },
                { dataKey: 'overdue', label: t('dashboard.aging.overdue') },
              ]}
              margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
            />
          </VxBox>
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
