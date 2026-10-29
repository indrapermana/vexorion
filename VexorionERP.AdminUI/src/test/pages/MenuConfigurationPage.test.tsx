import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getTenantMenuConfiguration: vi.fn(),
  getTenantModuleEffectiveAccess: vi.fn(),
  getTenants: vi.fn(),
  updateTenantMenuConfiguration: vi.fn(),
}))

vi.mock('@vexorion/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vexorion/ui')>()
  return {
    ...actual,
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxSwitch: ({ checked, disabled, onChange, slotProps }: { checked: boolean; disabled?: boolean; onChange: (_event: unknown, checked: boolean) => void; slotProps?: { input?: { 'aria-label'?: string } } }) => (
      <input type="checkbox" role="switch" aria-label={slotProps?.input?.['aria-label']} checked={checked} disabled={disabled} onChange={(event) => onChange(event, event.target.checked)} />
    ),
    VxTable: ({ children, 'aria-label': ariaLabel }: { children: React.ReactNode; 'aria-label'?: string }) => <table aria-label={ariaLabel}>{children}</table>,
    VxTableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    VxTableCell: ({ children, component, scope }: { children: React.ReactNode; component?: string; scope?: string }) => component === 'th' ? <th scope={scope}>{children}</th> : <td>{children}</td>,
    VxTableContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    VxTableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
    VxTableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  }
})

vi.mock('react-i18next', () => {
  const t = (key: string, options?: { name?: string }) => {
      const messages: Record<string, string> = {
        'pages.menuConfiguration.title': 'Menu Configuration',
        'pages.menuConfiguration.description': 'Access layers',
        'pages.menuConfiguration.tenant': 'Tenant',
        'pages.menuConfiguration.previewTitle': 'Tenant menu access preview',
        'pages.menuConfiguration.accessPolicy': 'Menu visibility does not grant module or route access.',
        'pages.menuConfiguration.activeTenant': 'Active tenant',
        'pages.menuConfiguration.noDomain': 'No custom domain',
        'pages.menuConfiguration.menuKey': 'menu key:',
        'pages.menuConfiguration.columns.workspace': 'Workspace',
        'pages.menuConfiguration.columns.preference': 'Menu preference',
        'pages.menuConfiguration.columns.policy': 'Rollout policy',
        'pages.menuConfiguration.columns.entitlement': 'Tenant entitlement',
        'pages.menuConfiguration.columns.permission': 'User permission',
        'pages.menuConfiguration.columns.result': 'Tenant result',
        'pages.menuConfiguration.states.allowed': 'Allowed',
        'pages.menuConfiguration.states.blocked': 'Blocked',
        'pages.menuConfiguration.states.enabled': 'Enabled',
        'pages.menuConfiguration.states.disabled': 'Disabled',
        'pages.menuConfiguration.states.notRequired': 'Not required',
        'pages.menuConfiguration.states.unavailable': 'Unavailable',
        'pages.menuConfiguration.states.perUser': 'Evaluated per user',
        'pages.menuConfiguration.results.eligible': 'Eligible before permission',
        'pages.menuConfiguration.results.hidden': 'Hidden by preference',
        'pages.menuConfiguration.results.policyBlocked': 'Blocked by policy',
        'pages.menuConfiguration.results.notEntitled': 'Module disabled',
        'pages.menuConfiguration.results.unavailable': 'Module status unavailable',
        'pages.menuConfiguration.loading': 'Loading menu configuration...',
        'pages.menuConfiguration.saved': 'Menu configuration saved.',
        'common.save': 'Save',
        'common.saving': 'Saving...',
        'common.retry': 'Retry',
        'menuItems.projectDocuments': 'Project Documents',
        'menuItems.projects': 'Projects',
        'menuItems.employees': 'Employees',
      }

      if (key === 'pages.menuConfiguration.showItem') return `Show ${options?.name ?? ''} in the tenant menu`
      return messages[key] ?? key
  }

  return { useTranslation: () => ({ t }) }
})

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['tenants.view', 'tenants.manage'] } }),
}))

vi.mock('../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getTenantMenuConfiguration: apiMocks.getTenantMenuConfiguration,
  getTenantModuleEffectiveAccess: apiMocks.getTenantModuleEffectiveAccess,
  getTenants: apiMocks.getTenants,
  reportClientDiagnostic: vi.fn(),
  updateTenantMenuConfiguration: apiMocks.updateTenantMenuConfiguration,
}))

import MenuConfigurationPage from '../../pages/MenuConfigurationPage'

describe('MenuConfigurationPage access preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getTenants.mockResolvedValue([{ id: 'tenant-1', name: 'Acme', code: 'ACME', isActive: true, createdAtUtc: '2026-01-01T00:00:00Z' }])
    apiMocks.getTenantMenuConfiguration.mockResolvedValue({ hiddenMenuLinks: ['/projects'] })
    apiMocks.getTenantModuleEffectiveAccess.mockResolvedValue({
      tenantId: 'tenant-1',
      tenantCode: 'ACME',
      project: { toggleEnabled: true, rolloutGateEnabled: true, rolloutMode: 'AllowList', allowedByRollout: true, effectiveEnabled: true },
      document: { toggleEnabled: false, rolloutGateEnabled: false, rolloutMode: 'AllowAll', allowedByRollout: true, effectiveEnabled: false },
      employee: { toggleEnabled: true, rolloutGateEnabled: true, rolloutMode: 'AllowList', allowedByRollout: false, effectiveEnabled: false },
    })
    apiMocks.updateTenantMenuConfiguration.mockImplementation(async (_tenantId: string, hiddenMenuLinks: string[]) => ({ hiddenMenuLinks }))
  })

  it('separates preference, policy, entitlement, and per-user permission', async () => {
    render(<MenuConfigurationPage />)

    expect(await screen.findByRole('table', { name: 'Tenant menu access preview' }, { timeout: 10_000 })).toBeInTheDocument()
    expect(screen.getByText('Menu visibility does not grant module or route access.')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Project Documents/ })).toHaveTextContent('Allowed')
    expect(screen.getByRole('row', { name: /Project Documents/ })).toHaveTextContent('Disabled')
    expect(screen.getByRole('row', { name: /Project Documents/ })).toHaveTextContent('Module disabled')
    expect(screen.getByRole('row', { name: /Employees/ })).toHaveTextContent('Blocked')
    expect(screen.getByRole('row', { name: /Employees/ })).toHaveTextContent('Blocked by policy')
    expect(screen.getByRole('row', { name: /Projects/ })).toHaveTextContent('Hidden by preference')
    expect(screen.getAllByText('Evaluated per user').length).toBeGreaterThan(0)
  }, 15_000)

  it('saves the navigation preference without changing access layers', async () => {
    render(<MenuConfigurationPage />)

    const projectSwitch = await screen.findByRole('switch', { name: 'Show Projects in the tenant menu' }, { timeout: 10_000 })
    await userEvent.click(projectSwitch)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(apiMocks.updateTenantMenuConfiguration).toHaveBeenCalledWith('tenant-1', []))
    expect(await screen.findByText('Menu configuration saved.')).toBeInTheDocument()
  }, 15_000)
})
