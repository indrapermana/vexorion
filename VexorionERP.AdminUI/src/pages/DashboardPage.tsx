import { VxBox, VxChip, VxPageFeedback, VxPageHeader, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApartmentRoundedIcon, PersonRoundedIcon, StackedBarChartRoundedIcon, TravelExploreRoundedIcon, VxCard } from '@vexorion/ui'
import { getTenantTelemetry, getTenants, getUsersForAdmin } from '../lib/api'
import type { TenantListItemResponse, TenantTelemetryListItemResponse } from '../types/api'
import type { UserListItemResponse } from '../types/api/users'

function DashboardMetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <VxCard title={label} className="stat-card dashboard-stat-card">
      <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxBox className="metric-icon">{icon}</VxBox>
        <VxTypography variant="h5">{value}</VxTypography>
      </VxStack>
    </VxCard>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<TenantListItemResponse[]>([])
  const [users, setUsers] = useState<UserListItemResponse[]>([])
  const [telemetryByTenant, setTelemetryByTenant] = useState<Map<string, TenantTelemetryListItemResponse>>(new Map())
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setError(null)

    try {
      const [tenantData, userData, telemetry] = await Promise.all([getTenants(), getUsersForAdmin(), getTenantTelemetry(rangeDays)])
      setTenants(tenantData)
      setUsers(userData)
      setTelemetryByTenant(new Map(telemetry.tenants.map((item) => [item.tenantId, item])))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pages.dashboard.loadError'))
      console.error(err)
    }
  }, [rangeDays, t])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const activeTenants = tenants.filter((x) => x.isActive).length
  const paidTenants = tenants.filter((x) => Boolean(x.domain)).length
  const freeTenants = tenants.length - paidTenants

  const mostVisitedPage = useMemo(() => {
    const values = [...telemetryByTenant.values()]
    if (values.length === 0) {
      return { page: null as string | null, visits: 0 }
    }

    const top = values.reduce((best, current) => {
      if ((current.mostVisitedPageVisits ?? 0) > (best.mostVisitedPageVisits ?? 0)) {
        return current
      }

      return best
    })

    return {
      page: top.mostVisitedPage ?? null,
      visits: top.mostVisitedPageVisits ?? 0,
    }
  }, [telemetryByTenant])

  const usersByTenant = useMemo(() => {
    const map = new Map<string, number>()

    users.forEach((user) => {
      map.set(user.tenantId, (map.get(user.tenantId) ?? 0) + 1)
    })

    return map
  }, [users])

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader title={t('pages.dashboard.title')} description={t('pages.dashboard.description')} filters={(
          <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <VxChip
              label={t('pages.dashboard.last7Days')}
              color={rangeDays === 7 ? 'primary' : 'default'}
              variant={rangeDays === 7 ? 'filled' : 'outlined'}
              onClick={() => setRangeDays(7)}
            />
            <VxChip
              label={t('pages.dashboard.last30Days')}
              color={rangeDays === 30 ? 'primary' : 'default'}
              variant={rangeDays === 30 ? 'filled' : 'outlined'}
              onClick={() => setRangeDays(30)}
            />
          </VxStack>
      )} />

      <VxPageFeedback error={error} />

      <VxBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(4, 1fr)' } }}>
        <VxBox>
          <DashboardMetricCard label={t('pages.dashboard.totalTenants')} value={String(tenants.length)} icon={<ApartmentRoundedIcon />} />
        </VxBox>
        <VxBox>
          <DashboardMetricCard label={t('pages.dashboard.activeTenants')} value={String(activeTenants)} icon={<StackedBarChartRoundedIcon />} />
        </VxBox>
        <VxBox>
          <DashboardMetricCard label={t('pages.dashboard.totalUsers')} value={String(users.length)} icon={<PersonRoundedIcon />} />
        </VxBox>
        <VxBox>
          <DashboardMetricCard
            label={t('pages.dashboard.mostVisitedPage')}
            value={mostVisitedPage.visits > 0 && mostVisitedPage.page ? `${mostVisitedPage.page} (${mostVisitedPage.visits})` : t('pages.dashboard.notAvailable')}
            icon={<TravelExploreRoundedIcon />}
          />
        </VxBox>
      </VxBox>

      <VxBox sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' } }}>
        <VxBox>
          <VxPaper className="panel-card" elevation={0}>
            <VxTypography variant="h6" sx={{ mb: 1.5 }}>{t('pages.dashboard.freePaid')}</VxTypography>
            <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <VxChip color="success" label={t('pages.dashboard.free', { count: freeTenants })} />
              <VxChip color="primary" label={t('pages.dashboard.paid', { count: paidTenants })} />
            </VxStack>
            <VxTypography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              {t('pages.dashboard.paidHint')}
            </VxTypography>
          </VxPaper>
        </VxBox>

        <VxBox>
          <VxPaper className="panel-card" elevation={0}>
            <VxTypography variant="h6" sx={{ mb: 1.5 }}>{t('pages.dashboard.loginOverview')}</VxTypography>
            <VxStack spacing={1}>
              {tenants.map((tenant) => (
                <VxStack key={tenant.id} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, minWidth: 0 }}>
                  <VxTypography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>
                    {tenant.name} ({tenant.code})
                  </VxTypography>
                  <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <VxChip size="small" label={t('pages.dashboard.users', { count: usersByTenant.get(tenant.id) ?? 0 })} />
                    <VxChip size="small" variant="outlined" label={t('pages.dashboard.logins', { count: telemetryByTenant.get(tenant.id)?.loginCount ?? 0 })} />
                    <VxChip
                      size="small"
                      variant="outlined"
                      label={
                        telemetryByTenant.get(tenant.id)?.mostVisitedPage
                          ? t('pages.dashboard.topPage', { page: telemetryByTenant.get(tenant.id)?.mostVisitedPage ?? '', count: telemetryByTenant.get(tenant.id)?.mostVisitedPageVisits ?? 0 })
                          : t('pages.dashboard.topPageUnavailable')
                      }
                    />
                  </VxStack>
                </VxStack>
              ))}
            </VxStack>
          </VxPaper>
        </VxBox>
      </VxBox>
    </VxStack>
  )
}
