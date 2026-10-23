import { VxBox, VxGrid, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { VxBarChart } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { AgingBucketTotalsResponse } from '../../../types/api'
import type { AgingPoint } from '../types'

type AgingCardProps = {
  t: TFunction
  title: string
  data: AgingPoint[]
  totals: AgingBucketTotalsResponse | null
  emptyText: string
}

function AgingCard({ t, title, data, totals, emptyText }: AgingCardProps) {
  const { formatMoney } = useCurrency()
  return (
    <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <VxTypography component="h2" variant="h6" sx={{ mb: 2 }}>{title}</VxTypography>
      {data.length > 0 ? (
        <VxBox sx={{ width: '100%', height: 300 }}>
          <VxBarChart
            dataset={data}
            xAxis={[{ scaleType: 'band', dataKey: 'name' }]}
            series={[{ dataKey: 'value', label: t('dashboard.table.amount') }]}
            margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
          />
        </VxBox>
      ) : (
        <VxTypography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{emptyText}</VxTypography>
      )}
      {totals && (
        <VxStack spacing={1} sx={{ mt: 2 }}>
          <VxBox sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <VxTypography variant="body2">{t('dashboard.aging.total')}</VxTypography>
            <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{formatMoney(totals.total)}</VxTypography>
          </VxBox>
          <VxBox sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <VxTypography variant="body2">{t('dashboard.aging.overdue90')}</VxTypography>
            <VxTypography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>{formatMoney(totals.dueOver90)}</VxTypography>
          </VxBox>
        </VxStack>
      )}
    </VxPaper>
  )
}

type DashboardAgingSectionProps = {
  t: TFunction
  arAgingData: AgingPoint[]
  apAgingData: AgingPoint[]
  arTotals: AgingBucketTotalsResponse | null
  apTotals: AgingBucketTotalsResponse | null
}

export default function DashboardAgingSection({
  t,
  arAgingData,
  apAgingData,
  arTotals,
  apTotals,
}: DashboardAgingSectionProps) {
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, md: 6 }}>
        <AgingCard
          t={t}
          title={t('dashboard.aging.arTitle')}
          data={arAgingData}
          totals={arTotals}
          emptyText={t('dashboard.aging.emptyAr')}
        />
      </VxGrid>
      <VxGrid size={{ xs: 12, md: 6 }}>
        <AgingCard
          t={t}
          title={t('dashboard.aging.apTitle')}
          data={apAgingData}
          totals={apTotals}
          emptyText={t('dashboard.aging.emptyAp')}
        />
      </VxGrid>
    </VxGrid>
  )
}
