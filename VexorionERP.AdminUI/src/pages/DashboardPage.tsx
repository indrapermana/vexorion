import {
  ApartmentRoundedIcon,
  PersonRoundedIcon,
  StackedBarChartRoundedIcon,
  VxAlert,
  VxBox,
  VxButton,
  VxCard,
  VxChip,
  VxPageBody,
  VxPageEmpty,
  VxPageFeedback,
  VxPageHeader,
  VxPageLoading,
  VxPaper,
  VxStack,
  VxTypography,
} from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, getTenantTelemetry, getTenants, getUsersForAdmin, reportClientDiagnostic } from '../lib/api'
import type { TenantListItemResponse, TenantTelemetryListItemResponse } from '../types/api'
import type { UserListItemResponse } from '../types/api/users'

function DashboardMetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <VxCard title={label} titleComponent="p" className="stat-card dashboard-stat-card">
      <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxBox className="metric-icon">{icon}</VxBox>
        <VxTypography component="p" variant="h5">{value}</VxTypography>
      </VxStack>
    </VxCard>
  )
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) reportClientDiagnostic('operation.failed', error)
  return error instanceof ApiError ? error.message : fallback
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<TenantListItemResponse[] | null>(null)
  const [users, setUsers] = useState<UserListItemResponse[] | null>(null)
  const [telemetryByTenant, setTelemetryByTenant] = useState<Map<string, TenantTelemetryListItemResponse> | null>(null)
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [coreError, setCoreError] = useState<string | null>(null)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)
  const [isCoreLoading, setIsCoreLoading] = useState(true)
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(true)

  const loadCoreMetrics = useCallback(async () => {
    setCoreError(null)
    setIsCoreLoading(true)

    const [tenantResult, userResult] = await Promise.allSettled([getTenants(), getUsersForAdmin()])
    const errors: string[] = []

    if (tenantResult.status === 'fulfilled') setTenants(tenantResult.value)
    else errors.push(errorMessage(tenantResult.reason, t('pages.dashboard.tenantLoadError')))

    if (userResult.status === 'fulfilled') setUsers(userResult.value)
    else errors.push(errorMessage(userResult.reason, t('pages.dashboard.userLoadError')))

    setCoreError(errors.length > 0 ? errors.join(' ') : null)
    setIsCoreLoading(false)
  }, [t])

  const loadTelemetry = useCallback(async () => {
    setTelemetryError(null)
    setTelemetryByTenant(null)
    setIsTelemetryLoading(true)

    try {
      const telemetry = await getTenantTelemetry(rangeDays)
      setTelemetryByTenant(new Map(telemetry.tenants.map((item) => [item.tenantId, item])))
    } catch (error) {
      setTelemetryError(errorMessage(error, t('pages.dashboard.telemetryLoadError')))
    } finally {
      setIsTelemetryLoading(false)
    }
  }, [rangeDays, t])

  useEffect(() => { void loadCoreMetrics() }, [loadCoreMetrics])
  useEffect(() => { void loadTelemetry() }, [loadTelemetry])

  const activeTenants = tenants?.filter((tenant) => tenant.isActive).length ?? null
  const inactiveTenants = tenants === null || activeTenants === null ? null : tenants.length - activeTenants
  const activeUsers = users?.filter((user) => user.isActive).length ?? null
  const inactiveUsers = users === null || activeUsers === null ? null : users.length - activeUsers
  const metricValue = (value: number | null) => value === null ? t('pages.dashboard.notAvailable') : String(value)

  const mostVisitedPage = useMemo(() => {
    const values = telemetryByTenant ? [...telemetryByTenant.values()] : []
    if (values.length === 0) return null
    const top = values.reduce((best, current) =>
      (current.mostVisitedPageVisits ?? 0) > (best.mostVisitedPageVisits ?? 0) ? current : best)
    return top.mostVisitedPage && top.mostVisitedPageVisits > 0
      ? { page: top.mostVisitedPage, visits: top.mostVisitedPageVisits }
      : null
  }, [telemetryByTenant])

  const usersByTenant = useMemo(() => {
    if (users === null) return null
    const map = new Map<string, number>()
    users.forEach((user) => map.set(user.tenantId, (map.get(user.tenantId) ?? 0) + 1))
    return map
  }, [users])

  const hasNoData = tenants?.length === 0 && users?.length === 0
  const hasCoreData = tenants !== null || users !== null

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader title={t('pages.dashboard.title')} description={t('pages.dashboard.description')} filters={(
        <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <VxChip label={t('pages.dashboard.last7Days')} color={rangeDays === 7 ? 'primary' : 'default'} variant={rangeDays === 7 ? 'filled' : 'outlined'} aria-pressed={rangeDays === 7} onClick={() => setRangeDays(7)} />
          <VxChip label={t('pages.dashboard.last30Days')} color={rangeDays === 30 ? 'primary' : 'default'} variant={rangeDays === 30 ? 'filled' : 'outlined'} aria-pressed={rangeDays === 30} onClick={() => setRangeDays(30)} />
        </VxStack>
      )} />

      <VxPageFeedback error={coreError} onRetry={() => void loadCoreMetrics()} retryLabel={t('common.retry')} />

      {isCoreLoading && !hasCoreData ? (
        <VxPageBody><VxPageLoading label={t('common.loading')} /></VxPageBody>
      ) : !hasCoreData ? null : hasNoData ? (
        <VxPageBody><VxPageEmpty title={t('pages.dashboard.emptyTitle')} description={t('pages.dashboard.emptyDescription')} /></VxPageBody>
      ) : (
        <>
          <VxBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>
            <DashboardMetricCard label={t('pages.dashboard.totalTenants')} value={metricValue(tenants?.length ?? null)} icon={<ApartmentRoundedIcon />} />
            <DashboardMetricCard label={t('pages.dashboard.activeTenants')} value={metricValue(activeTenants)} icon={<StackedBarChartRoundedIcon />} />
            <DashboardMetricCard label={t('pages.dashboard.totalUsers')} value={metricValue(users?.length ?? null)} icon={<PersonRoundedIcon />} />
            <DashboardMetricCard label={t('pages.dashboard.activeUsers')} value={metricValue(activeUsers)} icon={<PersonRoundedIcon />} />
          </VxBox>

          <VxBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(260px, 1fr) minmax(0, 2fr)' } }}>
            <VxPaper component="section" className="panel-card" elevation={0} sx={{ minWidth: 0 }}>
              <VxTypography component="h2" variant="h6" sx={{ mb: 1.5 }}>{t('pages.dashboard.accountStatus')}</VxTypography>
              <VxStack spacing={2}>
                <VxBox>
                  <VxTypography component="h3" variant="subtitle2" sx={{ mb: 1 }}>{t('pages.dashboard.tenants')}</VxTypography>
                  <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    <VxChip color="success" label={t('pages.dashboard.active', { count: activeTenants ?? t('pages.dashboard.notAvailable') })} />
                    <VxChip label={t('pages.dashboard.inactive', { count: inactiveTenants ?? t('pages.dashboard.notAvailable') })} />
                  </VxStack>
                </VxBox>
                <VxBox>
                  <VxTypography component="h3" variant="subtitle2" sx={{ mb: 1 }}>{t('pages.dashboard.usersHeading')}</VxTypography>
                  <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    <VxChip color="success" label={t('pages.dashboard.active', { count: activeUsers ?? t('pages.dashboard.notAvailable') })} />
                    <VxChip label={t('pages.dashboard.inactive', { count: inactiveUsers ?? t('pages.dashboard.notAvailable') })} />
                  </VxStack>
                </VxBox>
              </VxStack>
            </VxPaper>

            <VxPaper component="section" className="panel-card" elevation={0} sx={{ minWidth: 0 }}>
              <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                <VxTypography component="h2" variant="h6">{t('pages.dashboard.activityOverview')}</VxTypography>
                {!isTelemetryLoading && !telemetryError ? (
                  <VxTypography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {mostVisitedPage ? t('pages.dashboard.overallTopPage', { page: mostVisitedPage.page, count: mostVisitedPage.visits }) : t('pages.dashboard.topPageUnavailable')}
                  </VxTypography>
                ) : null}
              </VxStack>

              {telemetryError ? (
                <VxAlert severity="warning" action={<VxButton color="inherit" size="small" onClick={() => void loadTelemetry()}>{t('common.retry')}</VxButton>} sx={{ mb: 1.5 }}>
                  {telemetryError}
                </VxAlert>
              ) : null}
              {isTelemetryLoading ? <VxTypography role="status" color="text.secondary" sx={{ mb: 1.5 }}>{t('pages.dashboard.loadingActivity')}</VxTypography> : null}

              {tenants?.length ? (
                <VxStack spacing={1.25}>
                  {tenants.map((tenant) => {
                    const telemetry = telemetryByTenant?.get(tenant.id)
                    return (
                      <VxStack key={tenant.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, minWidth: 0 }}>
                        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <VxTypography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{tenant.name} ({tenant.code})</VxTypography>
                          <VxChip size="small" color={tenant.isActive ? 'success' : 'default'} label={tenant.isActive ? t('components.tenants.grid.active') : t('components.tenants.grid.inactive')} />
                        </VxStack>
                        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, minWidth: 0 }}>
                          <VxChip size="small" label={t('pages.dashboard.users', { count: usersByTenant?.get(tenant.id) ?? t('pages.dashboard.notAvailable') })} />
                          <VxChip size="small" variant="outlined" label={t('pages.dashboard.logins', { count: telemetry?.loginCount ?? t('pages.dashboard.notAvailable') })} />
                          <VxChip size="small" variant="outlined" sx={{ maxWidth: '100%' }} label={telemetry?.mostVisitedPage ? t('pages.dashboard.topPage', { page: telemetry.mostVisitedPage, count: telemetry.mostVisitedPageVisits }) : t('pages.dashboard.topPageUnavailable')} />
                        </VxStack>
                      </VxStack>
                    )
                  })}
                </VxStack>
              ) : <VxTypography color="text.secondary">{t('pages.dashboard.noTenantActivity')}</VxTypography>}
            </VxPaper>
          </VxBox>
        </>
      )}
    </VxStack>
  )
}
