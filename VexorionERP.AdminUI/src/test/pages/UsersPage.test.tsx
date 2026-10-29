import type React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RolePermissionsResponse } from '../../types/api/roles'
import type { TenantListItemResponse } from '../../types/api'
import type { UserListItemResponse } from '../../types/api/users'

const apiMocks = vi.hoisted(() => ({
  assignUserRoles: vi.fn(),
  createUser: vi.fn(),
  getRoles: vi.fn(),
  getTenants: vi.fn(),
  getUsersForAdmin: vi.fn(),
  resetUserPassword: vi.fn(),
  setUserStatus: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.viewOnly': 'View only',
        'components.tenants.grid.active': 'Active',
        'components.tenants.grid.inactive': 'Inactive',
        'pages.users.activate': 'Activate',
        'pages.users.add': 'Add Tenant User',
        'pages.users.allTenants': 'All tenants',
        'pages.users.columns.actions': 'Actions',
        'pages.users.columns.roles': 'Roles',
        'pages.users.columns.status': 'Status',
        'pages.users.columns.tenant': 'Tenant',
        'pages.users.columns.user': 'User',
        'pages.users.create': 'Create User',
        'pages.users.createScope': 'This user will be created in Acme Corp (ACME).',
        'pages.users.createSecurity': 'The account is active and the operation is audited.',
        'pages.users.deactivate': 'Deactivate',
        'pages.users.deactivateConsequence': 'The user will no longer be able to sign in.',
        'pages.users.deactivateTitle': 'Deactivate user',
        'pages.users.deactivating': 'Deactivating...',
        'pages.users.description': 'Manage tenant users, roles, passwords, and access status.',
        'pages.users.email': 'Email',
        'pages.users.firstName': 'First name',
        'pages.users.lastName': 'Last name',
        'pages.users.newPassword': 'New password',
        'pages.users.password': 'Password',
        'pages.users.reset': 'Reset',
        'pages.users.resetPassword': 'Reset Password',
        'pages.users.passwordContext': 'Resetting this password revokes refresh sessions and is audited.',
        'pages.users.roleWarning': 'Role changes take effect the next time the user signs in.',
        'pages.users.roles': 'Roles',
        'pages.users.roleContext': 'Replacing roles applies with a new access token and is audited.',
        'pages.users.saveRoles': 'Save Roles',
        'pages.users.tenantFilter': 'Tenant',
        'pages.users.title': 'Users',
        'pages.users.updateRoles': 'Update Roles',
        'pages.users.username': 'Username',
        'pages.users.viewOnly': 'You have view-only access.',
        'pages.users.success.created': 'User created.',
        'pages.users.success.roles': 'User roles updated.',
        'pages.users.success.password': 'Password reset and refresh sessions revoked.',
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({
    user: {
      tenantId: 'tenant-1',
      permissions: ['users.view', 'users.manage', 'roles.view', 'tenants.view'],
    },
  }),
}))

vi.mock('@vexorion/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vexorion/ui')>()
  return {
    ...actual,
    VxDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) => open ? <div role="dialog">{children}</div> : null,
    VxDataGrid: ({ rows, columns }: { rows: UserListItemResponse[]; columns: Array<{ field: string; headerName: string; renderCell?: (params: { row: UserListItemResponse }) => unknown; valueGetter?: (_value: unknown, row: UserListItemResponse) => unknown }> }) => (
      <div>
        {rows.map((row) => (
          <div key={row.id}>
            {columns.map((column) => (
              <div key={column.field}>
                <span>{column.headerName}</span>
                <div>
                  {column.renderCell
                    ? column.renderCell({ row }) as React.ReactNode
                    : column.valueGetter
                      ? String(column.valueGetter(undefined, row) ?? '')
                      : String((row as Record<string, unknown>)[column.field] ?? '')}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  }
})

vi.mock('../../lib/api', () => apiMocks)

import UsersPage from '../../pages/UsersPage'

const TENANTS: TenantListItemResponse[] = [
  {
    id: 'tenant-1',
    name: 'Acme Corp',
    code: 'ACME',
    domain: 'acme.test',
    isActive: true,
    createdAtUtc: '2026-05-01T00:00:00.000Z',
  },
]

const ROLES: RolePermissionsResponse[] = [
  { role: 'Admin', permissions: ['users.manage'] },
  { role: 'Manager', permissions: ['reports.view'] },
]

const USERS: UserListItemResponse[] = [
  {
    id: 'user-1',
    tenantId: 'tenant-1',
    userName: 'alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Admin',
    isActive: true,
    roles: ['Admin'],
  },
]

describe('UsersPage dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getRoles.mockResolvedValue(ROLES)
    apiMocks.getTenants.mockResolvedValue(TENANTS)
    apiMocks.getUsersForAdmin.mockResolvedValue(USERS)
    apiMocks.createUser.mockResolvedValue({
      id: 'user-2',
      tenantId: 'tenant-1',
      userName: 'bob',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Builder',
      isActive: true,
      roles: [],
    })
    apiMocks.assignUserRoles.mockResolvedValue(undefined)
    apiMocks.resetUserPassword.mockResolvedValue(undefined)
    apiMocks.setUserStatus.mockResolvedValue(undefined)
  })

  it('creates a tenant user from the create dialog', async () => {
    const user = userEvent.setup()
    render(<UsersPage />)

    await screen.findByText('alice')
    await user.click(screen.getByRole('button', { name: /add tenant user/i }))
    expect(screen.getByText('This user will be created in Acme Corp (ACME).')).toBeInTheDocument()
    expect(screen.getByText('The account is active and the operation is audited.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TopSecret123' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Builder' } })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => {
      expect(apiMocks.createUser).toHaveBeenCalledWith({
        userName: 'bob',
        email: 'bob@example.com',
        password: 'TopSecret123',
        firstName: 'Bob',
        lastName: 'Builder',
        roles: [],
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Add Tenant User' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('User created.')).toBeInTheDocument()
  })

  it('opens the roles dialog and saves the selected user roles', async () => {
    render(<UsersPage />)

    await screen.findByText('alice')
    await userEvent.click(screen.getByRole('button', { name: /update roles/i }))
    expect(screen.getByText('Replacing roles applies with a new access token and is audited.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save Roles' }))

    await waitFor(() => {
      expect(apiMocks.assignUserRoles).toHaveBeenCalledWith('user-1', {
        roles: ['Admin'],
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Update Roles' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('User roles updated.')).toBeInTheDocument()
  })

  it('resets a user password from the reset dialog', async () => {
    render(<UsersPage />)

    await screen.findByText('alice')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
    expect(screen.getByText('Resetting this password revokes refresh sessions and is audited.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword456')
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

    await waitFor(() => {
      expect(apiMocks.resetUserPassword).toHaveBeenCalledWith('user-1', {
        newPassword: 'NewPassword456',
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Reset Password' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('Password reset and refresh sessions revoked.')).toBeInTheDocument()
  })
})
