import { Alert, Box, Stack, TextField, Typography } from '@mui/material'
import type { TFunction } from 'i18next'

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
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>{t('dashboard.hero.title')}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
        {t('dashboard.hero.description')}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          type="date"
          label={t('dashboard.filters.asOfDate')}
          value={asOfDate}
          onChange={(event) => onAsOfDateChange(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        <TextField
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
        </TextField>
        {error ? <Alert severity="error" sx={{ flex: 1 }}>{error}</Alert> : null}
      </Stack>
    </Box>
  )
}
