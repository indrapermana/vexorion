import { TrendingDownRoundedIcon, TrendingUpRoundedIcon } from '@vexorion/ui'
import { VxBox, VxGrid, VxPaper, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { QuickStat } from '../types'

type DashboardQuickStatsSectionProps = {
  t: TFunction
  quickStats: QuickStat[]
}

export default function DashboardQuickStatsSection({ t, quickStats }: DashboardQuickStatsSectionProps) {
  return (
    <VxGrid container spacing={2}>
      {quickStats.map((stat) => (
        <VxGrid key={stat.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <VxPaper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              {stat.label}
            </VxTypography>
            <VxTypography variant="h6" sx={{ mb: 0.5 }}>
              {stat.value}
            </VxTypography>
            <VxBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.25 }}>
              {stat.trend === 'positive' ? (
                <TrendingUpRoundedIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <TrendingDownRoundedIcon sx={{ fontSize: 14, color: 'error.main' }} />
              )}
              <VxTypography variant="caption" color={stat.trend === 'positive' ? 'success.main' : 'error.main'}>
                {stat.trend === 'positive' ? t('dashboard.quickStats.good') : t('dashboard.quickStats.alert')}
              </VxTypography>
            </VxBox>
          </VxPaper>
        </VxGrid>
      ))}
    </VxGrid>
  )
}
