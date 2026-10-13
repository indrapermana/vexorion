import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

    await user.type(screen.getByLabelText('Username'), 'bob')
    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.type(screen.getByLabelText('Password'), 'topsecret123')
    await user.type(screen.getByLabelText('First name'), 'Bob')
    await user.type(screen.getByLabelText('Last name'), 'Builder')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => {
      expect(apiMocks.createUser).toHaveBeenCalledWith({
        userName: 'bob',
        email: 'bob@example.com',
        password: 'topsecret123',
        firstName: 'Bob',
        lastName: 'Builder',
        roles: [],
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Add Tenant User' })).not.toBeInTheDocument()
    })
  })

  it('opens the roles dialog and saves the selected user roles', async () => {
    render(<UsersPage />)

    await screen.findByText('alice')
    await userEvent.click(screen.getByRole('button', { name: /update roles/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Roles' }))

    await waitFor(() => {
      expect(apiMocks.assignUserRoles).toHaveBeenCalledWith('user-1', {
        roles: ['Admin'],
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Update Roles' })).not.toBeInTheDocument()
    })
  })

  it('resets a user password from the reset dialog', async () => {
    render(<UsersPage />)

    await screen.findByText('alice')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    await userEvent.type(screen.getByLabelText('New password'), 'new-password-456')
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

    await waitFor(() => {
      expect(apiMocks.resetUserPassword).toHaveBeenCalledWith('user-1', {
        newPassword: 'new-password-456',
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Reset Password' })).not.toBeInTheDocument()
    })
  })
})
