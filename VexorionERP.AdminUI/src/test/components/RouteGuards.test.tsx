import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  permissions: [] as string[],
  roles: [] as string[],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'routeGuards.checkingSession': 'Checking session',
        'routeGuards.loadingWorkspace': 'Loading workspace',
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({
    session: authState.isAuthenticated ? { accessToken: 'token' } : null,
    user: authState.isAuthenticated ? { permissions: authState.permissions, roles: authState.roles } : null,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    error: null,
    validation: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearFeedback: vi.fn(),
  }),
}))

import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '../../components/RouteGuards'

function renderProtectedRoute(initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function renderPublicOnlyRoute(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Home page</div>} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<div>Public content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteGuards', () => {
  it('shows a loading message while ProtectedRoute is checking session state', () => {
    authState.isLoading = true
    authState.isAuthenticated = false

    renderProtectedRoute()

    expect(screen.getByText('Checking session')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login on ProtectedRoute', () => {
    authState.isLoading = false
    authState.isAuthenticated = false

    renderProtectedRoute()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the protected outlet when the user is authenticated', () => {
    authState.isLoading = false
    authState.isAuthenticated = true
    authState.roles = ['SystemAdmin']

    renderProtectedRoute()

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('blocks authenticated tenant administrators from the platform console', () => {
    authState.isLoading = false
    authState.isAuthenticated = true
    authState.roles = ['TenantAdmin']

    renderProtectedRoute()

    expect(screen.getByRole('alert')).toHaveTextContent('routeGuards.systemAdminRequired')
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('shows a loading message while PublicOnlyRoute is checking state', () => {
    authState.isLoading = true
    authState.isAuthenticated = false

    renderPublicOnlyRoute()

    expect(screen.getByText('Loading workspace')).toBeInTheDocument()
  })

  it('redirects authenticated users away from public-only routes', () => {
    authState.isLoading = false
    authState.isAuthenticated = true

    renderPublicOnlyRoute()

    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it('renders the outlet for unauthenticated users on public-only routes', () => {
    authState.isLoading = false
    authState.isAuthenticated = false

    renderPublicOnlyRoute()

    expect(screen.getByText('Public content')).toBeInTheDocument()
  })

  it('does not mount an unauthorized admin route', () => {
    authState.isLoading = false
    authState.isAuthenticated = true
    authState.permissions = ['users.view']

    render(
      <MemoryRouter initialEntries={['/tenants']}>
        <Routes>
          <Route element={<PermissionRoute requirement={{ allOf: ['tenants.view'] }} />}>
            <Route path="/tenants" element={<div>Tenant content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('routeGuards.permissionDenied')
    expect(screen.queryByText('Tenant content')).not.toBeInTheDocument()
  })

  it('mounts an authorized admin route', () => {
    authState.isLoading = false
    authState.isAuthenticated = true
    authState.permissions = ['tenants.view']

    render(
      <MemoryRouter initialEntries={['/tenants']}>
        <Routes>
          <Route element={<PermissionRoute requirement={{ allOf: ['tenants.view'] }} />}>
            <Route path="/tenants" element={<div>Tenant content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Tenant content')).toBeInTheDocument()
  })
})
