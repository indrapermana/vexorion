import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { BarChart } from '@mui/x-charts'
import type { TFunction } from 'i18next'
import type { AgingBucketTotalsResponse } from '../../../types/api'
import { formatCurrency } from '../formatters'
import type { AgingPoint } from '../types'

type AgingCardProps = {
  t: TFunction
  title: string
  data: AgingPoint[]
  totals: AgingBucketTotalsResponse | null
  emptyText: string
}

function AgingCard({ t, title, data, totals, emptyText }: AgingCardProps) {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
      {data.length > 0 ? (
        <Box sx={{ width: '100%', height: 300 }}>
          <BarChart
            dataset={data}
            xAxis={[{ scaleType: 'band', dataKey: 'name' }]}
            series={[{ dataKey: 'value', label: t('dashboard.table.amount') }]}
            margin={{ top: 10, bottom: 30, left: 60, right: 10 }}
          />
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{emptyText}</Typography>
      )}
      {totals && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">{t('dashboard.aging.total')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(totals.total)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">{t('dashboard.aging.overdue90')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>{formatCurrency(totals.dueOver90)}</Typography>
          </Box>
        </Stack>
      )}
    </Paper>
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
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <AgingCard
          t={t}
          title={t('dashboard.aging.arTitle')}
          data={arAgingData}
          totals={arTotals}
          emptyText={t('dashboard.aging.emptyAr')}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <AgingCard
          t={t}
          title={t('dashboard.aging.apTitle')}
          data={apAgingData}
          totals={apTotals}
          emptyText={t('dashboard.aging.emptyAp')}
        />
      </Grid>
    </Grid>
  )
}
