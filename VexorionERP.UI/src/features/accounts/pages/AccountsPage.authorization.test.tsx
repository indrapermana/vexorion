import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  permissions: [] as string[],
  getAccounts: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { requiredPermission?: string }) => (
      key === 'authorization.readOnly'
        ? `Read only: ${options?.requiredPermission}`
        : key
    ),
  }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { permissions: testState.permissions },
  }),
}))

vi.mock('../../../lib/api', () => ({
  getAccounts: testState.getAccounts,
  deleteAccount: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('../components/AccountDataGrid', () => ({
  default: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="account-grid" data-can-manage={String(canManage)} />
  ),
}))

vi.mock('../components/AccountEditorDialog', () => ({ default: () => <div>Account editor</div> }))

import AccountsPage from './AccountsPage'

describe('AccountsPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.getAccounts.mockResolvedValue([])
  })

  it('keeps the account list readable while hiding mutation controls from a billing viewer', async () => {
    testState.permissions = ['billing.view']
    render(<AccountsPage />)

    await waitFor(() => expect(testState.getAccounts).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: 'pages.accounts.newButton' })).not.toBeInTheDocument()
    expect(screen.getByText(/billing\.manage/)).toBeInTheDocument()
    expect(screen.getByTestId('account-grid')).toHaveAttribute('data-can-manage', 'false')
  })

  it('exposes mutation controls when billing.manage is granted', async () => {
    testState.permissions = ['billing.view', 'billing.manage']
    render(<AccountsPage />)

    await waitFor(() => expect(testState.getAccounts).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'pages.accounts.newButton' })).toBeInTheDocument()
    expect(screen.getByTestId('account-grid')).toHaveAttribute('data-can-manage', 'true')
  })
})
