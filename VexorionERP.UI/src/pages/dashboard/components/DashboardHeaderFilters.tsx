import { VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { PageFeedback } from '../../../components/PagePrimitives'

type DashboardHeaderFiltersProps = {
  t: TFunction
  asOfDate: string
  periodDays: number
  periodOptions: number[]
  error: string | null
  onAsOfDateChange: (value: string) => void
  onPeriodChange: (value: number) => void
}

export default function DashboardHeaderFilters({
  t,
  asOfDate,
  periodDays,
  periodOptions,
  error,
  onAsOfDateChange,
  onPeriodChange,
}: DashboardHeaderFiltersProps) {
  return (
    <VxStack spacing={2}>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <VxTypography id="dashboard-overview-title" component="h2" variant="h6">{t('dashboard.sections.overview')}</VxTypography>
        <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <VxTextField
          type="date"
          label={t('dashboard.filters.asOfDate')}
          value={asOfDate}
          onChange={(event) => onAsOfDateChange(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />
        <VxTextField
          select
          label={t('dashboard.filters.window')}
          value={periodDays}
          onChange={(event) => onPeriodChange(Number(event.target.value))}
          slotProps={{ select: { native: true } }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          {periodOptions.map((option) => (
            <option key={option} value={option}>{t('dashboard.filters.daysOption', { days: option })}</option>
          ))}
        </VxTextField>
        </VxStack>
      </VxStack>
      <PageFeedback error={error} />
    </VxStack>
  )
}
