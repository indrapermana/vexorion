import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TenantListItemResponse } from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  getTenantModuleEffectiveAccess: vi.fn(),
  updateTenant: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'components.tenants.editor.editTitle': 'Edit tenant',
        'components.tenants.editor.codeLabel': 'Code',
        'components.tenants.editor.nameLabel': 'Name',
        'components.tenants.editor.domainLabel': 'Domain',
        'components.tenants.editor.activeLabel': 'Active',
        'components.tenants.editor.tenantChangeContext': 'Tenant identity changes do not change modules, menus, or roles.',
        'components.tenants.editor.accessPreviewHelp': 'Policy and entitlement are separate from permissions and menu preferences.',
        'components.tenants.editor.validationRequired': 'Name is required',
        'components.tenants.editor.validationMin': 'Name must be at least 2 characters',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.saving': 'Saving...',
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock('../../../lib/api', () => ({
  getTenantModuleEffectiveAccess: apiMocks.getTenantModuleEffectiveAccess,
  updateTenant: apiMocks.updateTenant,
}))

import { TenantEditorDialog } from '../../../features/tenants/components/TenantEditorDialog'

const TENANT: TenantListItemResponse = {
  id: 'tenant-1',
  name: 'Acme Corp',
  code: 'ACME',
  domain: 'acme.test',
  isActive: true,
  createdAtUtc: '2026-05-01T00:00:00.000Z',
}

describe('TenantEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getTenantModuleEffectiveAccess.mockResolvedValue({
      tenantId: TENANT.id,
      tenantCode: TENANT.code,
      project: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'all', allowedByRollout: true, effectiveEnabled: true },
      document: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'all', allowedByRollout: true, effectiveEnabled: true },
      employee: { toggleEnabled: true, rolloutGateEnabled: false, rolloutMode: 'all', allowedByRollout: true, effectiveEnabled: true },
    })
  })

  it('renders the selected tenant values', () => {
    render(<TenantEditorDialog open tenant={TENANT} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByDisplayValue('ACME')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('acme.test')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'components.tenants.editor.accessPreview', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('Tenant identity changes do not change modules, menus, or roles.')).toBeInTheDocument()
    expect(screen.getByText('Policy and entitlement are separate from permissions and menu preferences.')).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn()

    render(<TenantEditorDialog open tenant={TENANT} onClose={onClose} onSaved={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows validation when name is cleared and save is clicked', async () => {
    render(<TenantEditorDialog open tenant={TENANT} onClose={vi.fn()} onSaved={vi.fn()} />)

    const nameInput = screen.getByLabelText('Name')
    await userEvent.clear(nameInput)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
  })

  it('saves valid changes and notifies the parent', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const updatedTenant = { ...TENANT, name: 'Acme Updated', domain: 'updated.test', isActive: false }
    apiMocks.updateTenant.mockResolvedValueOnce(updatedTenant)

    render(<TenantEditorDialog open tenant={TENANT} onClose={onClose} onSaved={onSaved} />)

    const nameInput = screen.getByLabelText('Name')
    const domainInput = screen.getByLabelText('Domain')
    const activeCheckbox = screen.getByRole('checkbox', { name: 'Active' })

    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Acme Updated')
    await userEvent.clear(domainInput)
    await userEvent.type(domainInput, 'updated.test')
    await userEvent.click(activeCheckbox)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(apiMocks.updateTenant).toHaveBeenCalledWith('tenant-1', {
        name: 'Acme Updated',
        domain: 'updated.test',
        isActive: false,
      })
    })

    expect(onSaved).toHaveBeenCalledWith(updatedTenant)
    expect(onClose).toHaveBeenCalled()
  })
})
