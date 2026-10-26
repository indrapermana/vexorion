import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TenantRelationshipsPage from './TenantRelationshipsPage'

const mocks = vi.hoisted(() => ({
  permissions: ['tenants.view', 'tenants.manage'],
  t: (key: string) => key,
  getTenants: vi.fn(), getTenantRelationships: vi.fn(), getActiveTenantRelationships: vi.fn(),
  createTenantRelationship: vi.fn(), updateTenantRelationship: vi.fn(), activateTenantRelationship: vi.fn(), deleteTenantRelationship: vi.fn(),
}))

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }))
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { tenantId: 'owner', permissions: mocks.permissions } }) }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...mocks }))

function relationship(scopeJson: string | null, status = 1) {
  return {
    id: 'relationship-1', tenantId: 'owner', relatedTenantId: 'partner', relationshipType: 4,
    status, effectiveFrom: null, effectiveTo: null, contractReference: null, scopeJson,
    createdAtUtc: '2026-10-26T10:00:00Z', updatedAtUtc: '2026-10-26T10:00:00Z',
  }
}

describe('TenantRelationshipsPage pickers and scope controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.permissions = ['tenants.view', 'tenants.manage']
    mocks.getTenants.mockResolvedValue([
      { id: 'owner', code: 'OWNER', name: 'Current tenant', isActive: true },
      { id: 'partner', code: 'PARTNER', name: 'Eligible Partner', isActive: true },
      { id: 'inactive', code: 'INACTIVE', name: 'Inactive Partner', isActive: false },
    ])
    mocks.getTenantRelationships.mockResolvedValue([])
    mocks.getActiveTenantRelationships.mockResolvedValue([])
    mocks.createTenantRelationship.mockResolvedValue({})
    mocks.updateTenantRelationship.mockResolvedValue({})
    mocks.activateTenantRelationship.mockResolvedValue({})
  })

  it('uses a named tenant picker, excludes self, disables inactive tenants, and submits explicit permissions', async () => {
    const user = userEvent.setup()
    render(<TenantRelationshipsPage />)
    await waitFor(() => expect(mocks.getTenants).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'pages.tenantRelationships.newButton' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('combobox', { name: 'pages.tenantRelationships.fields.relatedTenant' }))
    expect(screen.queryByRole('option', { name: 'OWNER - Current tenant' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'INACTIVE - Inactive Partner' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('option', { name: 'PARTNER - Eligible Partner' }))
    const view = within(dialog).getByRole('checkbox', { name: 'pages.projectDetails.parties.fields.canViewDocuments' })
    expect(view).not.toBeChecked()
    await user.click(view)
    expect(within(dialog).queryByLabelText('pages.tenantRelationships.fields.scopeJson')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('pages.tenantRelationships.fields.relatedTenantId')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'common.create' }))
    await waitFor(() => expect(mocks.createTenantRelationship).toHaveBeenCalled())
    const request = mocks.createTenantRelationship.mock.calls[0][0]
    expect(request.relatedTenantId).toBe('partner')
    expect(JSON.parse(request.scopeJson)).toEqual({ canViewDocuments: true, canUploadDocuments: false, canAssignPeople: false })
  })

  it('preserves legacy unrestricted scope when editing other relationship fields', async () => {
    mocks.getTenantRelationships.mockResolvedValue([relationship(null, 2)])
    const user = userEvent.setup()
    render(<TenantRelationshipsPage />)
    await user.click(await screen.findByRole('button', { name: 'common.edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: 'pages.projectDetails.parties.fields.canViewDocuments' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'pages.projectDetails.parties.fields.canUploadDocuments' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'pages.projectDetails.parties.fields.canAssignPeople' })).toBeChecked()
    await user.type(within(dialog).getByLabelText('pages.tenantRelationships.fields.contractReference'), 'Agreement')
    await user.click(within(dialog).getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(mocks.updateTenantRelationship).toHaveBeenCalledWith('relationship-1', expect.objectContaining({ scopeJson: null, contractReference: 'Agreement' })))
  })

  it('activates using named permissions without dropping unrelated scope properties', async () => {
    mocks.getTenantRelationships.mockResolvedValue([relationship(JSON.stringify({ canViewDocuments: true, custom: { region: 'east' } }))])
    const user = userEvent.setup()
    render(<TenantRelationshipsPage />)
    await user.click(await screen.findByRole('button', { name: 'pages.tenantRelationships.activateButton' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'pages.projectDetails.parties.fields.canAssignPeople' }))
    await user.click(within(dialog).getByRole('button', { name: 'pages.tenantRelationships.activateButton' }))
    await waitFor(() => expect(mocks.activateTenantRelationship).toHaveBeenCalled())
    expect(JSON.parse(mocks.activateTenantRelationship.mock.calls[0][1].scopeJson)).toEqual({
      canViewDocuments: true, canUploadDocuments: false, canAssignPeople: true, custom: { region: 'east' },
    })
  })

  it('keeps tenant labels readable and does not expose mutation controls to read-only users', async () => {
    mocks.permissions = ['tenants.view']
    mocks.getTenantRelationships.mockResolvedValue([relationship(null)])
    render(<TenantRelationshipsPage />)
    expect(await screen.findByText('PARTNER - Eligible Partner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'pages.tenantRelationships.newButton' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'pages.tenantRelationships.activeOnly' })).toBeInTheDocument()
  })
})