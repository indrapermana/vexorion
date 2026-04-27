import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { Box, Grid, Paper, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import type { QuickStat } from '../types'

type DashboardQuickStatsSectionProps = {
  t: TFunction
  quickStats: QuickStat[]
}

export default function DashboardQuickStatsSection({ t, quickStats }: DashboardQuickStatsSectionProps) {
  return (
    <Grid container spacing={2}>
      {quickStats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              {stat.label}
            </Typography>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {stat.value}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.25 }}>
              {stat.trend === 'positive' ? (
                <TrendingUpRoundedIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <TrendingDownRoundedIcon sx={{ fontSize: 14, color: 'error.main' }} />
              )}
              <Typography variant="caption" color={stat.trend === 'positive' ? 'success.main' : 'error.main'}>
                {stat.trend === 'positive' ? t('dashboard.quickStats.good') : t('dashboard.quickStats.alert')}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
