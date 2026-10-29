import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getTenants: vi.fn(),
  getUsersForAdmin: vi.fn(),
  getTenantTelemetry: vi.fn(),
  reportClientDiagnostic: vi.fn(),
}))

const translations: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.retry': 'Retry',
  'components.tenants.grid.active': 'Active',
  'components.tenants.grid.inactive': 'Inactive',
  'pages.dashboard.title': 'System Admin Dashboard',
  'pages.dashboard.description': 'Dashboard description',
  'pages.dashboard.last7Days': 'Last 7 days',
  'pages.dashboard.last30Days': 'Last 30 days',
  'pages.dashboard.totalTenants': 'Total tenants',
  'pages.dashboard.activeTenants': 'Active tenants',
  'pages.dashboard.totalUsers': 'Total users',
  'pages.dashboard.activeUsers': 'Active users',
  'pages.dashboard.accountStatus': 'Account status',
  'pages.dashboard.tenants': 'Tenants',
  'pages.dashboard.usersHeading': 'Users',
  'pages.dashboard.active': 'Active: {{count}}',
  'pages.dashboard.inactive': 'Inactive: {{count}}',
  'pages.dashboard.activityOverview': 'Tenant activity',
  'pages.dashboard.loadingActivity': 'Loading tenant activity...',
  'pages.dashboard.overallTopPage': 'Overall top page: {{page}} ({{count}} visits)',
  'pages.dashboard.topPage': 'Top page: {{page}} ({{count}})',
  'pages.dashboard.topPageUnavailable': 'Top page: N/A',
  'pages.dashboard.tenantLoadError': 'Unable to load tenant metrics.',
  'pages.dashboard.userLoadError': 'Unable to load user metrics.',
  'pages.dashboard.telemetryLoadError': 'Unable to load tenant activity for this period.',
  'pages.dashboard.users': 'Users: {{count}}',
  'pages.dashboard.logins': 'Logins: {{count}}',
  'pages.dashboard.notAvailable': 'N/A',
  'pages.dashboard.noTenantActivity': 'Tenant activity unavailable.',
  'pages.dashboard.emptyTitle': 'No tenants yet',
  'pages.dashboard.emptyDescription': 'Tenant activity will appear here.',
}

const translate = (key: string, options?: Record<string, string | number>) => Object.entries(options ?? {}).reduce(
  (value, [name, replacement]) => value.replace(`{{${name}}}`, String(replacement)),
  translations[key] ?? key,
)

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))

vi.mock('../../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/api')>(),
  ...apiMocks,
}))

import DashboardPage from '../../pages/DashboardPage'

const tenants = [
  { id: 'tenant-1', name: 'Alpha', code: 'ALPHA', domain: 'alpha.example', isActive: true, createdAtUtc: '2026-01-01T00:00:00Z' },
  { id: 'tenant-2', name: 'Beta', code: 'BETA', domain: null, isActive: false, createdAtUtc: '2026-01-02T00:00:00Z' },
]

const users = [
  { id: 'user-1', tenantId: 'tenant-1', userName: 'alice', email: 'alice@example.com', isActive: true, roles: [] },
  { id: 'user-2', tenantId: 'tenant-1', userName: 'bob', email: 'bob@example.com', isActive: false, roles: [] },
  { id: 'user-3', tenantId: 'tenant-2', userName: 'carol', email: 'carol@example.com', isActive: true, roles: [] },
]

const telemetry = {
  tenants: [
    { tenantId: 'tenant-1', loginCount: 5, mostVisitedPage: '/products', mostVisitedPageVisits: 8 },
    { tenantId: 'tenant-2', loginCount: 2, mostVisitedPage: null, mostVisitedPageVisits: 0 },
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getTenants.mockResolvedValue(tenants)
    apiMocks.getUsersForAdmin.mockResolvedValue(users)
    apiMocks.getTenantTelemetry.mockResolvedValue(telemetry)
  })

  it('uses directory status for metrics instead of inferring billing state from domains', async () => {
    render(<DashboardPage />)

    expect(await screen.findByText('Alpha (ALPHA)')).toBeInTheDocument()
    expect(screen.getByText('Active users')).toBeInTheDocument()
    expect(screen.getAllByText('Active: 1')).toHaveLength(1)
    expect(screen.getByText('Active: 2')).toBeInTheDocument()
    expect(screen.getAllByText('Inactive: 1')).toHaveLength(2)
    expect(screen.getByText('Overall top page: /products (8 visits)')).toBeInTheDocument()
    expect(screen.queryByText(/free|paid/i)).not.toBeInTheDocument()
  })

  it('reloads only telemetry when the activity range changes', async () => {
    render(<DashboardPage />)
    await screen.findByText('Alpha (ALPHA)')

    await userEvent.click(screen.getByText('Last 30 days'))

    await waitFor(() => expect(apiMocks.getTenantTelemetry).toHaveBeenLastCalledWith(30))
    expect(apiMocks.getTenantTelemetry).toHaveBeenCalledTimes(2)
    expect(apiMocks.getTenants).toHaveBeenCalledTimes(1)
    expect(apiMocks.getUsersForAdmin).toHaveBeenCalledTimes(1)
  })

  it('keeps tenant and user metrics available when telemetry fails', async () => {
    apiMocks.getTenantTelemetry.mockRejectedValue(new Error('offline'))
    render(<DashboardPage />)

    expect(await screen.findByText('Alpha (ALPHA)')).toBeInTheDocument()
    expect(screen.getByText('Unable to load tenant activity for this period.')).toBeInTheDocument()
    expect(screen.getByText('Total tenants')).toBeInTheDocument()
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getAllByText('Logins: N/A')).toHaveLength(2)
  })
})
