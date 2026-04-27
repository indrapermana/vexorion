import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import type { FinanceDashboardSnapshotResponse } from '../../../types/api'
import { formatCurrency } from '../formatters'

type DashboardKpiCardsProps = {
  t: TFunction
  snapshot: FinanceDashboardSnapshotResponse | null
  periodDays: number
}

export default function DashboardKpiCards({ t, snapshot, periodDays }: DashboardKpiCardsProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(108, 92, 231, 0.08)' }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.openReceivables')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {formatCurrency(snapshot?.receivablesOpen ?? 0)}
                </Typography>
              </Box>
              <PaidRoundedIcon sx={{ color: 'primary.main', fontSize: 28, opacity: 0.7 }} />
            </Box>
            {(snapshot?.receivablesOverdue ?? 0) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingDownRoundedIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="caption" color="warning.main">
                  {t('dashboard.summary.overdueAmount', { amount: formatCurrency(snapshot?.receivablesOverdue ?? 0) })}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(160, 107, 213, 0.08)' }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.openPayables')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {formatCurrency(snapshot?.payablesOpen ?? 0)}
                </Typography>
              </Box>
              <Inventory2RoundedIcon sx={{ color: 'secondary.main', fontSize: 28, opacity: 0.7 }} />
            </Box>
            {(snapshot?.payablesOverdue ?? 0) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingDownRoundedIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="caption" color="warning.main">
                  {t('dashboard.summary.overdueAmount', { amount: formatCurrency(snapshot?.payablesOverdue ?? 0) })}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(0, 170, 68, 0.08)' }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.revenuePeriod', { days: periodDays })}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {formatCurrency(snapshot?.revenueInPeriod ?? 0)}
                </Typography>
              </Box>
              <InsightsRoundedIcon sx={{ color: 'success.main', fontSize: 28, opacity: 0.7 }} />
            </Box>
            {(snapshot?.revenueInPeriod ?? 0) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpRoundedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="caption" color="success.main">
                  {t('dashboard.summary.netCashAmount', { amount: formatCurrency(snapshot?.netCashInPeriod ?? 0) })}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(255, 153, 0, 0.08)' }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('dashboard.summary.netCashFlow')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {formatCurrency(snapshot?.netCashInPeriod ?? 0)}
                </Typography>
              </Box>
              <PaidRoundedIcon sx={{ color: 'warning.main', fontSize: 28, opacity: 0.7 }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color={(snapshot?.netCashInPeriod ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                {(snapshot?.netCashInPeriod ?? 0) >= 0 ? t('dashboard.summary.positiveFlow') : t('dashboard.summary.negativeFlow')}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}
