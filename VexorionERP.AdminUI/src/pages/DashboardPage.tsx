import { Alert, Box, Chip, Paper, Stack, Typography } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApartmentRoundedIcon, PersonRoundedIcon, StackedBarChartRoundedIcon, TravelExploreRoundedIcon, VxCard } from '@vexorion/ui'
import { getTenantTelemetry, getTenants, getUsersForAdmin } from '../lib/api'
import type { TenantListItemResponse, TenantTelemetryListItemResponse } from '../types/api'
import type { UserListItemResponse } from '../types/api/users'

function DashboardMetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <VxCard title={label} className="stat-card dashboard-stat-card">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box className="metric-icon">{icon}</Box>
        <Typography variant="h5">{value}</Typography>
      </Stack>
    </VxCard>
  )
}

export default function DashboardPage() {
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
      setError('Unable to load dashboard metrics right now.')
      console.error(err)
    }
  }, [rangeDays])

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
    <Stack spacing={2.5}>
      <Paper className="hero-panel dashboard-banner" elevation={0}>
        <Stack spacing={1}>
          <Typography variant="h5">System Admin Dashboard</Typography>
          <Typography color="text.secondary">
            Snapshot across all tenants and users using backend telemetry and tenant analytics.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label="Last 7 days"
              color={rangeDays === 7 ? 'primary' : 'default'}
              variant={rangeDays === 7 ? 'filled' : 'outlined'}
              onClick={() => setRangeDays(7)}
            />
            <Chip
              label="Last 30 days"
              color={rangeDays === 30 ? 'primary' : 'default'}
              variant={rangeDays === 30 ? 'filled' : 'outlined'}
              onClick={() => setRangeDays(30)}
            />
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(4, 1fr)' } }}>
        <Box>
          <DashboardMetricCard label="Total tenants" value={String(tenants.length)} icon={<ApartmentRoundedIcon />} />
        </Box>
        <Box>
          <DashboardMetricCard label="Active tenants" value={String(activeTenants)} icon={<StackedBarChartRoundedIcon />} />
        </Box>
        <Box>
          <DashboardMetricCard label="Total users" value={String(users.length)} icon={<PersonRoundedIcon />} />
        </Box>
        <Box>
          <DashboardMetricCard
            label="Most visited page"
            value={mostVisitedPage.visits > 0 && mostVisitedPage.page ? `${mostVisitedPage.page} (${mostVisitedPage.visits})` : 'N/A'}
            icon={<TravelExploreRoundedIcon />}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' } }}>
        <Box>
          <Paper className="panel-card" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Free vs Paid Tenants</Typography>
            <Stack direction="row" spacing={1}>
              <Chip color="success" label={`Free: ${freeTenants}`} />
              <Chip color="primary" label={`Paid: ${paidTenants}`} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              Paid tenants are inferred from tenants with a configured domain.
            </Typography>
          </Paper>
        </Box>

        <Box>
          <Paper className="panel-card" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Tenant Login Overview</Typography>
            <Stack spacing={1}>
              {tenants.map((tenant) => (
                <Stack key={tenant.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {tenant.name} ({tenant.code})
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip size="small" label={`Users: ${usersByTenant.get(tenant.id) ?? 0}`} />
                    <Chip size="small" variant="outlined" label={`Logins: ${telemetryByTenant.get(tenant.id)?.loginCount ?? 0}`} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        telemetryByTenant.get(tenant.id)?.mostVisitedPage
                          ? `Top page: ${telemetryByTenant.get(tenant.id)?.mostVisitedPage} (${telemetryByTenant.get(tenant.id)?.mostVisitedPageVisits ?? 0})`
                          : 'Top page: N/A'
                      }
                    />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Stack>
  )
}
