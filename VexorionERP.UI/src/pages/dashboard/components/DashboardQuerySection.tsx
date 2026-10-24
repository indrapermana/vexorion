import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshRoundedIcon, VxAlert, VxCircularProgress, VxIconButton, VxStack, VxTooltip, VxTypography } from '@vexorion/ui'
import { getIntlLocale } from '../../../i18n/translationConstant'
import DashboardSectionLoader from './DashboardSectionLoader'

export type DashboardQueryState = {
  data: unknown
  isPending: boolean
  isFetching: boolean
  isError: boolean
  dataUpdatedAt: number
  refetch: () => Promise<unknown>
}

type DashboardQuerySectionProps = {
  label: string
  query: DashboardQueryState
  children: ReactNode
  minHeight?: number
}

export default function DashboardQuerySection({ label, query, children, minHeight = 200 }: DashboardQuerySectionProps) {
  const { t, i18n } = useTranslation()
  const hasData = query.data !== undefined && query.data !== null
  const loading = !hasData && query.isPending
  const failed = query.isError || (!hasData && !query.isPending)
  const action = t(failed ? 'dashboard.query.retry' : 'dashboard.query.refresh', { section: label })

  return (
    <VxStack component="section" aria-label={label} aria-busy={query.isFetching || loading} spacing={1.5} sx={{ minWidth: 0 }}>
      <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <VxStack spacing={0.5} sx={{ minWidth: 0 }}>
          {hasData && query.dataUpdatedAt > 0 ? (
            <VxTypography variant="caption" color="text.secondary">
              {t('dashboard.query.lastUpdated', { section: label })}{' '}
              <time dateTime={new Date(query.dataUpdatedAt).toISOString()}>
                {new Date(query.dataUpdatedAt).toLocaleString(getIntlLocale(i18n.resolvedLanguage))}
              </time>
            </VxTypography>
          ) : null}
          {query.isFetching && hasData ? <VxTypography role="status" variant="caption">{t('dashboard.query.updating', { section: label })}</VxTypography> : null}
        </VxStack>
        {!loading ? (
          <VxTooltip title={action}>
            <span>
              <VxIconButton aria-label={action} size="small" disabled={query.isFetching} onClick={() => { void query.refetch() }}>
                {query.isFetching ? <VxCircularProgress size={18} /> : <RefreshRoundedIcon fontSize="small" />}
              </VxIconButton>
            </span>
          </VxTooltip>
        ) : null}
      </VxStack>
      {loading ? (
        <VxStack role="status" aria-label={t('dashboard.query.loading', { section: label })}>
          <DashboardSectionLoader minHeight={minHeight} />
        </VxStack>
      ) : null}
      {failed ? <VxAlert severity={hasData ? 'warning' : 'error'} role="alert">{t(hasData ? 'dashboard.query.stale' : 'dashboard.query.failed', { section: label })}</VxAlert> : null}
      {hasData ? children : null}
    </VxStack>
  )
}