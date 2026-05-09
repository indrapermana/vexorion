import { VxBox, VxGrid, VxPaper, VxTypography } from '@vexorion/ui'
import { VxBarChart, VxLineChart } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { BalancePoint, CashFlowPoint } from '../types'

type DashboardChartsSectionProps = {
  t: TFunction
  cashFlowChartData: CashFlowPoint[]
  receivablesVsPayablesData: BalancePoint[]
}

export default function DashboardChartsSection({
  t,
  cashFlowChartData,
  receivablesVsPayablesData,
}: DashboardChartsSectionProps) {
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <VxTypography variant="h6" sx={{ mb: 2 }}>{t('dashboard.charts.cashFlowTrends')}</VxTypography>
          <VxBox sx={{ width: '100%', height: 300 }}>
            <VxLineChart
              series={[
                { data: cashFlowChartData.map((d) => d.inflow), label: t('dashboard.cashRows.inflow') },
                { data: cashFlowChartData.map((d) => d.outflow), label: t('dashboard.cashRows.outflow') },
              ]}
              xAxis={[{ data: cashFlowChartData.map((d) => d.day), scaleType: 'linear' }]}
              margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
            />
          </VxBox>
        </VxPaper>
      </VxGrid>

      <VxGrid size={{ xs: 12, md: 6 }}>
        <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <VxTypography variant="h6" sx={{ mb: 2 }}>{t('dashboard.charts.receivablesVsPayables')}</VxTypography>
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
