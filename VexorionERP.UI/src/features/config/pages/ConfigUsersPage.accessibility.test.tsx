/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import ConfigUsersPage from './ConfigUsersPage'
import type { RolePermissionsResponse, UserListItemResponse } from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  getUsers: vi.fn<() => Promise<UserListItemResponse[]>>(),
  getRolePermissions: vi.fn<() => Promise<RolePermissionsResponse[]>>(),
  assignUserRoles: vi.fn(),
  createUser: vi.fn(),
  setUserStatus: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { permissions: ['users.manage', 'roles.view', 'roles.manage'] },
  }),
}))

vi.mock('../../../lib/api', () => ({
  assignUserRoles: apiMocks.assignUserRoles,
  createUser: apiMocks.createUser,
  getRolePermissions: apiMocks.getRolePermissions,
  getUsers: apiMocks.getUsers,
  setUserStatus: apiMocks.setUserStatus,
}))

describe('ConfigUsersPage accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getUsers.mockResolvedValue([{
      id: 'user-1',
      tenantId: 'tenant-1',
      userName: 'admin',
      email: 'admin@example.com',
      isActive: true,
      roles: ['TenantAdmin'],
    }])
    apiMocks.getRolePermissions.mockResolvedValue([{ role: 'TenantAdmin', permissions: ['users.manage'] }])
  })

  it('names the active-state switch with its column label and user', async () => {
    render(<ConfigUsersPage />)
    const statusSwitch = await screen.findByRole('switch', {
      name: 'config.users.columns.active: admin',
    })

    expect(statusSwitch).toBeChecked()
    expect(screen.getByRole('table', { name: 'config.users.listSection' })).toBeInTheDocument()
  })

  it('names the role selector and save action with the affected user', async () => {
    render(<ConfigUsersPage />)

    expect(await screen.findByRole('combobox', {
      name: 'config.users.columns.roles: admin',
    })).toBeInTheDocument()
    expect(screen.getByRole('button', {
      name: 'config.users.saveRolesButton: admin',
    })).toBeInTheDocument()
  })
})
