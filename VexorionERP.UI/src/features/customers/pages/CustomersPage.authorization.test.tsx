import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  permissions: [] as string[],
  getCustomers: vi.fn(),
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
  getCustomers: testState.getCustomers,
  deleteCustomer: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('../components/CustomerDataGrid', () => ({
  default: ({ canManage }: { canManage?: boolean }) => (
    <div data-testid="customer-grid" data-can-manage={String(canManage)} />
  ),
}))

vi.mock('../components/CustomerEditorDialog', () => ({ default: () => <div>Customer editor</div> }))
vi.mock('../components/CustomerDeleteDialog', () => ({ default: () => <div>Customer delete</div> }))

import CustomersPage from './CustomersPage'

describe('CustomersPage authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.getCustomers.mockResolvedValue([])
  })

  it('keeps the list readable but hides mutation controls without customers.manage', async () => {
    testState.permissions = ['customers.view']
    render(<CustomersPage />)

    await waitFor(() => expect(testState.getCustomers).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: 'pages.customers.newButton' })).not.toBeInTheDocument()
    expect(screen.getByText('Read only: customers.manage')).toBeInTheDocument()
    expect(screen.getByTestId('customer-grid')).toHaveAttribute('data-can-manage', 'false')
  })

  it('exposes mutation controls when customers.manage is granted', async () => {
    testState.permissions = ['customers.view', 'customers.manage']
    render(<CustomersPage />)

    await waitFor(() => expect(testState.getCustomers).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'pages.customers.newButton' })).toBeInTheDocument()
    expect(screen.queryByText('Read only: customers.manage')).not.toBeInTheDocument()
    expect(screen.getByTestId('customer-grid')).toHaveAttribute('data-can-manage', 'true')
  })
})
