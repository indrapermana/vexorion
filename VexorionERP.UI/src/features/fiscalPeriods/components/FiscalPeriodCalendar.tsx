import { useState } from 'react'
import { VxAlert, VxBox, VxButton, VxChip, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../../../i18n/translationConstant'
import type { FiscalPeriodListItemResponse } from '../../../types/api'
import { getFiscalCalendarDates, getFiscalPeriodsForDate } from './fiscalPeriodCalendarUtils'

type FiscalPeriodCalendarProps = {
  periods: FiscalPeriodListItemResponse[]
  initialMonth?: Date
}

export default function FiscalPeriodCalendar({ periods, initialMonth }: FiscalPeriodCalendarProps) {
  const { t, i18n } = useTranslation()
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = initialMonth ?? new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const dates = getFiscalCalendarDates(year, month)
  const monthLabel = new Intl.DateTimeFormat(getIntlLocale(i18n.language), { month: 'long', year: 'numeric' }).format(visibleMonth)
  const today = localDateKey(new Date())

  const shiftMonth = (offset: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))

  return (
    <VxStack spacing={2}>
      <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <VxButton size="small" variant="outlined" onClick={() => shiftMonth(-1)}>{t('pages.fiscalPeriods.calendar.previousMonth')}</VxButton>
        <VxTypography component="h2" variant="h6" aria-live="polite">{monthLabel}</VxTypography>
        <VxButton size="small" variant="outlined" onClick={() => shiftMonth(1)}>{t('pages.fiscalPeriods.calendar.nextMonth')}</VxButton>
      </VxStack>

      <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <VxChip size="small" color="success" label={t('common.labels.open')} />
        <VxChip size="small" color="default" label={t('pages.fiscalPeriods.grid.closed')} />
      </VxStack>

      <VxBox role="grid" aria-label={t('pages.fiscalPeriods.calendar.title')} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.75 }}>
        {Array.from({ length: 7 }, (_, index) => (
          <VxBox key={`weekday-${index}`} role="columnheader" sx={{ px: 1, py: 0.75 }}>
            <VxTypography variant="caption" color="text.secondary">{t(`pages.fiscalPeriods.calendar.weekdays.${index}`)}</VxTypography>
          </VxBox>
        ))}
        {dates.map((date, index) => {
          const dayPeriods = date ? getFiscalPeriodsForDate(periods, date) : []
          return (
            <VxBox
              key={date ?? `empty-${index}`}
              role="gridcell"
              aria-label={date ? `${date}${dayPeriods.length ? `, ${dayPeriods.map((period) => `${period.periodCode}, ${period.isClosed ? t('pages.fiscalPeriods.grid.closed') : t('common.labels.open')}`).join('; ')}` : ''}` : undefined}
              sx={{
                minWidth: 0,
                minHeight: { xs: 76, md: 96 },
                p: 0.75,
                border: '1px solid',
                borderColor: date === today ? 'primary.main' : 'divider',
                borderRadius: 1,
                backgroundColor: date ? 'background.paper' : 'action.hover',
                opacity: date ? 1 : 0.45,
              }}
            >
              {date ? (
                <VxStack spacing={0.5} sx={{ minWidth: 0 }}>
                  <VxTypography variant="body2" sx={{ fontWeight: date === today ? 700 : 500 }}>{Number(date.slice(-2))}</VxTypography>
                  {dayPeriods.map((period) => (
                    <VxChip
                      key={period.id}
                      size="small"
                      color={period.isClosed ? 'default' : 'success'}
                      label={`${period.periodCode} · ${period.isClosed ? t('pages.fiscalPeriods.grid.closed') : t('common.labels.open')}`}
                      sx={{ maxWidth: '100%', justifyContent: 'flex-start', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    />
                  ))}
                </VxStack>
              ) : null}
            </VxBox>
          )
        })}
      </VxBox>
      {!periods.length ? <VxAlert severity="info">{t('pages.fiscalPeriods.calendar.empty')}</VxAlert> : null}
    </VxStack>
  )
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}