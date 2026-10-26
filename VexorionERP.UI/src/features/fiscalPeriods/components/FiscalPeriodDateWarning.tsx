import { VxAlert } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { FiscalPeriodListItemResponse } from '../../../types/api'
import { getFiscalPeriodDateStatus } from './fiscalPeriodCalendarUtils'

type FiscalPeriodDateWarningProps = {
  date: string
  periods: FiscalPeriodListItemResponse[]
  isLoading?: boolean
}

export default function FiscalPeriodDateWarning({ date, periods, isLoading = false }: FiscalPeriodDateWarningProps) {
  const { t } = useTranslation()
  if (isLoading) return null

  const dateStatus = getFiscalPeriodDateStatus(periods, date)
  if (dateStatus.status === 'open') {
    return <VxAlert severity="success">{t('pages.fiscalPeriods.dateStatus.open', { periodCode: dateStatus.period.periodCode })}</VxAlert>
  }
  if (dateStatus.status === 'closed') {
    return <VxAlert severity="warning">{t('pages.fiscalPeriods.dateStatus.closed', { periodCode: dateStatus.period.periodCode })}</VxAlert>
  }
  if (dateStatus.status === 'overlap') {
    return <VxAlert severity="error">{t('pages.fiscalPeriods.dateStatus.overlap', { date })}</VxAlert>
  }
  if (dateStatus.status === 'uncovered') {
    return <VxAlert severity="error">{t('pages.fiscalPeriods.dateStatus.uncovered', { date })}</VxAlert>
  }

  return <VxAlert severity="info">{t('pages.fiscalPeriods.dateStatus.unset')}</VxAlert>
}