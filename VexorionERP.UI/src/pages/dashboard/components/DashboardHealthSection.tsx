import { Box, Grid, LinearProgress, Paper, Stack, Typography } from '@vexorion/ui'
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
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2.5 }}>{t('dashboard.health.receivables')}</Typography>
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{t('dashboard.health.current')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{receivablesHealthPercent}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={receivablesHealthPercent} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.secondary">{t('dashboard.health.totalReceivables')}</Typography>
              <Typography variant="h6">{formatMoney(totalReceivables)}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2.5 }}>{t('dashboard.health.payables')}</Typography>
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{t('dashboard.health.current')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{payablesHealthPercent}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={payablesHealthPercent} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.secondary">{t('dashboard.health.totalPayables')}</Typography>
              <Typography variant="h6">{formatMoney(totalPayables)}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}
