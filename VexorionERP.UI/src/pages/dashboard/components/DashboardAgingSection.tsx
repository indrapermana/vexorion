import { VxBox, VxGrid, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { VxBarChart } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { AgingBucketTotalsResponse } from '../../../types/api'
import type { AgingPoint } from '../types'
import DashboardQuerySection, { type DashboardQueryState } from './DashboardQuerySection'

type AgingCardProps = {
  t: TFunction
  title: string
  data: AgingPoint[]
  totals: AgingBucketTotalsResponse | null
  emptyText: string
}

function AgingCard({ t, title, data, totals, emptyText }: AgingCardProps) {
  const { currencyCode, formatMoney } = useCurrency()
  return (
    <VxPaper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <VxTypography component="h2" variant="h6" sx={{ mb: 2 }}>{title}</VxTypography>
      {data.length > 0 ? (
        <VxBox sx={{ width: '100%', height: 300 }}>
          <VxBarChart
            dataset={data}
            xAxis={[{ scaleType: 'band', dataKey: 'name' }]}
            series={[{ dataKey: 'value', label: t('dashboard.table.amount'), valueFormatter: (value) => formatMoney(value ?? 0) }]}
            yAxis={[{ label: currencyCode }]}
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
  arQuery?: DashboardQueryState
  apQuery?: DashboardQueryState
}

export default function DashboardAgingSection({
  t,
  arAgingData,
  apAgingData,
  arTotals,
  apTotals,
  arQuery,
  apQuery,
}: DashboardAgingSectionProps) {
  const arCard = <AgingCard t={t} title={t('dashboard.aging.arTitle')} data={arAgingData} totals={arTotals} emptyText={t('dashboard.aging.emptyAr')} />
  const apCard = <AgingCard t={t} title={t('dashboard.aging.apTitle')} data={apAgingData} totals={apTotals} emptyText={t('dashboard.aging.emptyAp')} />
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, md: 6 }}>
        {arQuery ? <DashboardQuerySection label={t('dashboard.aging.arTitle')} query={arQuery} minHeight={300}>{arCard}</DashboardQuerySection> : arCard}
      </VxGrid>
      <VxGrid size={{ xs: 12, md: 6 }}>
        {apQuery ? <DashboardQuerySection label={t('dashboard.aging.apTitle')} query={apQuery} minHeight={300}>{apCard}</DashboardQuerySection> : apCard}
      </VxGrid>
    </VxGrid>
  )
}
