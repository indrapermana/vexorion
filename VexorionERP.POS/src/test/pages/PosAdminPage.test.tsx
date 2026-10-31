/// <reference types="vitest/globals" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import PosAdminPage from '../../pages/PosAdminPage'
import { renderWithProviders, screen, waitFor } from '../testUtils'
import userEvent from '@testing-library/user-event'
import * as api from '../../lib/api'

vi.mock('../../lib/api', () => ({
  getUsers: vi.fn(),
  assignUserRoles: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

const users = [
  {
    id: 'user-1', tenantId: 'tenant-1', userName: 'cashier.with.a.long.name',
    email: 'cashier.with.a.long.address@example.com', firstName: 'Casey', lastName: 'Cashier',
    roles: ['PosUser', 'InventoryViewer'], isActive: true,
  },
  {
    id: 'user-2', tenantId: 'tenant-1', userName: 'inactive', email: 'inactive@example.com',
    roles: [], isActive: false,
  },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <MemoryRouter><PosAdminPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('POS Admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getUsers).mockResolvedValue(users)
    vi.mocked(api.assignUserRoles).mockResolvedValue(undefined)
  })

  it('provides a dense table and narrow-screen user cards with the same actions', async () => {
    renderPage()

    expect(await screen.findByRole('table', { name: 'POS User Management' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByText('cashier.with.a.long.address@example.com')).toHaveLength(2)
    expect(screen.getAllByRole('switch', { name: 'POS User: inactive' })).toHaveLength(2)
    expect(screen.getAllByRole('switch', { name: 'POS User: inactive' })[0]).toBeDisabled()
  })

  it('updates the role through either responsive presentation and keeps feedback localized', async () => {
    const user = userEvent.setup()
    renderPage()
    const switches = await screen.findAllByRole('switch', { name: 'POS User: cashier.with.a.long.name' })

    await user.click(switches[0])

    await waitFor(() => expect(api.assignUserRoles).toHaveBeenCalledWith('user-1', { roles: ['InventoryViewer'] }))
    expect(await screen.findByText('Revoked POS User role for cashier.with.a.long.name.')).toBeInTheDocument()
  })

  it('shows an empty state when the tenant has no users', async () => {
    vi.mocked(api.getUsers).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No tenant users found')).toBeInTheDocument()
    expect(screen.getByText('Create a tenant user before assigning POS access.')).toBeInTheDocument()
  })

  it('shows a retry action when users fail to load', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getUsers).mockRejectedValueOnce(new Error('User service unavailable')).mockResolvedValueOnce(users)
    renderPage()

    expect(await screen.findByText('User service unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('table', { name: 'POS User Management' })).toBeInTheDocument()
    expect(api.getUsers).toHaveBeenCalledTimes(2)
  })
})
