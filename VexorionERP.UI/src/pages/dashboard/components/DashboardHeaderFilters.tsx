import { VxStack, VxTextField } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'

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
      <PageHeader
        title={t('dashboard.hero.title')}
        description={t('dashboard.hero.description')}
        filters={<VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <VxTextField
          type="date"
          label={t('dashboard.filters.asOfDate')}
          value={asOfDate}
          onChange={(event) => onAsOfDateChange(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        <VxTextField
          select
          label={t('dashboard.filters.window')}
          value={periodDays}
          onChange={(event) => onPeriodChange(Number(event.target.value))}
          slotProps={{ select: { native: true } }}
          sx={{ maxWidth: 220 }}
        >
          {periodOptions.map((option) => (
            <option key={option} value={option}>{t('dashboard.filters.daysOption', { days: option })}</option>
          ))}
        </VxTextField>
        </VxStack>}
      />
      <PageFeedback error={error} />
    </VxStack>
  )
}
