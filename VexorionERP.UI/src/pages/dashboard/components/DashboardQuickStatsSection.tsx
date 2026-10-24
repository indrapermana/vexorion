import { VxGrid, VxPaper, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { QuickStat } from '../types'

type DashboardQuickStatsSectionProps = {
  t: TFunction
  quickStats: QuickStat[]
}

export default function DashboardQuickStatsSection({ t, quickStats }: DashboardQuickStatsSectionProps) {
  return (
    <VxGrid container spacing={2} component="section" aria-label={t('dashboard.quickStats.title')}>
      {quickStats.map((stat) => (
        <VxGrid key={stat.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <VxPaper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              {stat.label}
            </VxTypography>
            <VxTypography component="p" variant="h6" sx={{ mb: 0.5 }}>
              {stat.value}
            </VxTypography>
            <VxTypography variant="caption" color="text.secondary">{stat.description}</VxTypography>
          </VxPaper>
        </VxGrid>
      ))}
    </VxGrid>
  )
}
