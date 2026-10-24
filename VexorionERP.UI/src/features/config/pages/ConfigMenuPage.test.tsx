import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Permissions } from '../../../app/authorization'
import { getHiddenMenuLinks, saveHiddenMenuLinks } from '../../../lib/menuConfig'
import ConfigMenuPage from './ConfigMenuPage'

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  modules: { isLoading: false, isError: false, projectManagementEnabled: true, employeeManagementEnabled: true, documentManagementEnabled: true },
  getPreferences: vi.fn(), updatePreferences: vi.fn(),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { tenantId: 'test-tenant', userName: 'Operator', permissions: state.permissions } }),
}))
vi.mock('../../../app/TenantModuleContext', () => ({ useTenantModules: () => state.modules }))
vi.mock('../../../lib/api', () => ({ getTenantPreferences: state.getPreferences, updateMenuConfiguration: state.updatePreferences }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key: string, values?: { name?: string }) => key === 'config.menu.showItem' ? `Show ${values?.name} in menu` : key,
}) }))

function rowFor(path: string) {
  return document.querySelector(`[data-menu-path="${path}"]`) as HTMLElement
}

async function loadedPage() {
  render(<ConfigMenuPage />)
  await screen.findByRole('region', { name: 'config.menu.previewTitle' })
}

describe('Menu preferences and effective access', () => {
  beforeEach(() => {
    state.permissions = [Permissions.organization.view, Permissions.organization.manage, Permissions.projects.view, Permissions.customers.view]
    state.modules = { isLoading: false, isError: false, projectManagementEnabled: true, employeeManagementEnabled: true, documentManagementEnabled: true }
    state.getPreferences.mockReset().mockResolvedValue({ hiddenMenuLinks: [] })
    state.updatePreferences.mockReset().mockImplementation(async (payload: { hiddenMenuLinks: string[] }) => payload)
    saveHiddenMenuLinks([])
  })

  it('previews hidden preferences locally and only updates navigation after save succeeds', async () => {
    await loadedPage()
    fireEvent.click(within(rowFor('/customers')).getByRole('checkbox'))
    expect(within(rowFor('/customers')).getByText('config.menu.results.hidden')).toBeInTheDocument()
    expect(within(rowFor('/customers')).getByText('config.menu.viewAllowed')).toBeInTheDocument()
    expect(screen.getByText('config.menu.unsaved')).toBeInTheDocument()
    expect(getHiddenMenuLinks()).toEqual([])
    expect(state.updatePreferences).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'config.menu.saveChanges' }))
    await screen.findByText('config.menu.feedback.saved')
    expect(state.updatePreferences).toHaveBeenCalledWith({ hiddenMenuLinks: ['/customers'] })
    expect(getHiddenMenuLinks()).toEqual(['/customers'])
  })

  it('shows preference, disabled module, and missing permission as separate states', async () => {
    state.modules.projectManagementEnabled = false
    await loadedPage()
    expect(within(rowFor('/projects')).getByRole('checkbox')).toBeChecked()
    expect(within(rowFor('/projects')).getByText('config.menu.modules.disabled')).toBeInTheDocument()
    expect(within(rowFor('/projects')).getByText('config.menu.viewAllowed')).toBeInTheDocument()
    expect(within(rowFor('/projects')).getByText('config.menu.results.moduleDisabled')).toBeInTheDocument()
    expect(within(rowFor('/products')).getByText('config.menu.results.permissionDenied')).toBeInTheDocument()
  })

  it('keeps read-only preview available without mutation controls', async () => {
    state.permissions = [Permissions.organization.view]
    await loadedPage()
    expect(screen.queryByRole('button', { name: 'config.menu.saveChanges' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'config.menu.resetDefaults' })).not.toBeInTheDocument()
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled()
  })

  it('does not permit overwriting preferences after a failed initial load', async () => {
    state.getPreferences.mockRejectedValueOnce(new Error('Unavailable'))
    render(<ConfigMenuPage />)
    await screen.findByText('config.menu.errors.load')
    expect(screen.getByRole('button', { name: 'config.menu.saveChanges' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'config.menu.resetDefaults' })).toBeDisabled()
    expect(screen.queryByRole('region', { name: 'config.menu.previewTitle' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    await screen.findByRole('region', { name: 'config.menu.previewTitle' })
    expect(state.updatePreferences).not.toHaveBeenCalled()
  })

  it('preserves the draft after save failure and retries the save rather than reloading preferences', async () => {
    state.updatePreferences.mockRejectedValueOnce(new Error('Unavailable'))
    await loadedPage()
    fireEvent.click(within(rowFor('/customers')).getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'config.menu.saveChanges' }))
    await screen.findByText('config.menu.errors.save')
    expect(within(rowFor('/customers')).getByRole('checkbox')).not.toBeChecked()
    expect(getHiddenMenuLinks()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    await screen.findByText('config.menu.feedback.saved')
    expect(state.getPreferences).toHaveBeenCalledTimes(1)
    expect(state.updatePreferences).toHaveBeenCalledTimes(2)
    expect(state.updatePreferences).toHaveBeenLastCalledWith({ hiddenMenuLinks: ['/customers'] })
  })

  it.each([['loading', 'isLoading'], ['unavailable', 'isError']] as const)('shows module configuration as %s rather than enabled', async (status, key) => {
    state.modules[key] = true
    await loadedPage()
    expect(within(rowFor('/projects')).getByText(`config.menu.modules.${status}`)).toBeInTheDocument()
    expect(within(rowFor('/projects')).queryByText('config.menu.results.visible')).not.toBeInTheDocument()
  })

  it('resets preferences without enabling a disabled module', async () => {
    state.modules.projectManagementEnabled = false
    state.getPreferences.mockResolvedValue({ hiddenMenuLinks: ['/projects'] })
    await loadedPage()
    expect(within(rowFor('/projects')).getByRole('checkbox')).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'config.menu.resetDefaults' }))
    await screen.findByText('config.menu.feedback.reset')
    await waitFor(() => expect(within(rowFor('/projects')).getByRole('checkbox')).toBeChecked())
    expect(within(rowFor('/projects')).getByText('config.menu.results.moduleDisabled')).toBeInTheDocument()
    expect(state.updatePreferences).toHaveBeenCalledWith({ hiddenMenuLinks: [] })
    expect(state.modules.projectManagementEnabled).toBe(false)
  })
})