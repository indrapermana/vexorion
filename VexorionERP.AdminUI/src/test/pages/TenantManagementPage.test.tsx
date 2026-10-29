import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  deleteTenant: vi.fn(),
  getTenantModuleEffectiveAccessBatch: vi.fn(),
  getTenants: vi.fn(),
}))

const translationMock = vi.hoisted(() => vi.fn((key: string, options?: { count?: number }) => key === 'pages.tenantManagement.errors.access'
  ? `Module access unavailable for ${options?.count ?? 0}`
  : ({
      'common.retry': 'Retry',
      'shell.tenants': 'Tenants',
      'pages.tenantManagement.description': 'Manage tenants',
      'pages.tenantManagement.metrics.rows': 'Total tenants',
      'pages.tenantManagement.metrics.active': 'Active tenants',
      'pages.tenantManagement.modulesDisabled': 'Modules disabled',
      'pages.tenantManagement.disabledOnly': 'Disabled only',
      'pages.tenantManagement.legend': 'Legend',
      'pages.tenantManagement.enabled': 'ON',
      'pages.tenantManagement.disabled': 'OFF',
      'pages.tenantManagement.modules.project': 'Project',
      'pages.tenantManagement.modules.document': 'Document',
      'pages.tenantManagement.modules.employee': 'Employee',
    } as Record<string, string>)[key] ?? key))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translationMock }),
}))

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['tenants.view', 'tenants.manage'] } }),
}))

vi.mock('../../lib/api', () => ({
  ...apiMocks,
  ApiError: class ApiError extends Error {},
  reportClientDiagnostic: vi.fn(),
}))

vi.mock('../../features/tenants/components/TenantDataGrid', () => ({
  TenantDataGrid: ({ rows }: { rows: Array<{ name: string }> }) => <div>{rows.map((row) => <span key={row.name}>{row.name}</span>)}</div>,
}))
vi.mock('../../features/tenants/components/TenantEditorDialog', () => ({ TenantEditorDialog: () => null }))
vi.mock('../../features/tenants/components/TenantOnboardingDialog', () => ({ TenantOnboardingDialog: () => null }))

import TenantManagementPage from '../../features/tenants/pages/TenantManagementPage'

const tenants = [
  { id: 'tenant-1', name: 'Alpha', code: 'ALPHA', domain: null, isActive: true, createdAtUtc: '2026-01-01T00:00:00Z' },
  { id: 'tenant-2', name: 'Beta', code: 'BETA', domain: null, isActive: true, createdAtUtc: '2026-01-01T00:00:00Z' },
]

const accessItem = (tenantId: string, tenantCode: string) => ({
  tenantId,
  tenantCode,
  project: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'AllowAll', allowedByRollout: true, effectiveEnabled: true },
  document: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'AllowAll', allowedByRollout: true, effectiveEnabled: true },
  employee: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'AllowAll', allowedByRollout: true, effectiveEnabled: true },
})

describe('TenantManagementPage module access summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getTenants.mockResolvedValue(tenants)
    apiMocks.getTenantModuleEffectiveAccessBatch.mockResolvedValue({ items: [], failedTenantIds: [] })
  })

  it('loads effective access with one batch request', async () => {
    render(<TenantManagementPage />)

    await screen.findByText('Alpha', undefined, { timeout: 5000 })
    expect(apiMocks.getTenants).toHaveBeenCalledOnce()
    expect(apiMocks.getTenantModuleEffectiveAccessBatch).toHaveBeenCalledOnce()
  })

  it('keeps tenants visible and retries only the partial access request', async () => {
    apiMocks.getTenantModuleEffectiveAccessBatch
      .mockResolvedValueOnce({ items: [], failedTenantIds: ['tenant-1'] })
      .mockResolvedValueOnce({ items: [accessItem('tenant-1', 'ALPHA'), accessItem('tenant-2', 'BETA')], failedTenantIds: [] })
    render(<TenantManagementPage />)

    expect(await screen.findByText('Alpha', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Module access unavailable for 2')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(apiMocks.getTenantModuleEffectiveAccessBatch).toHaveBeenCalledTimes(2))
    expect(apiMocks.getTenants).toHaveBeenCalledOnce()
  })
})
