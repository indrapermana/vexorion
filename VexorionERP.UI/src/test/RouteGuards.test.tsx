/// <reference types="vitest/globals" />

import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ModuleRouteGuard, PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '../components/RouteGuards'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key === 'routeGuards.loadingWorkspace' ? 'Loading workspace...' : key }),
}))

const mockUseAuth = vi.fn()
vi.mock('../app/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseTenantModules = vi.fn()
vi.mock('../app/TenantModuleContext', () => ({
  useTenantModules: () => mockUseTenantModules(),
}))

function Protected() {
  return <div>Protected Content</div>
}
function Public() {
  return <div>Public Content</div>
}

function ModulePage({ load }: { load: () => void }) {
  useEffect(() => {
    load()
  }, [load])

  return <div>Module Content</div>
}

describe('ProtectedRoute', () => {
  it('shows loading alert while session is being checked', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Protected />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('routeGuards.checkingSession')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Protected />} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders the outlet when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Protected />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

describe('PublicOnlyRoute', () => {
  it('shows loading alert while session is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Public />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Loading workspace...')).toBeInTheDocument()
  })

  it('redirects to / when already authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Public />} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Public Content')).not.toBeInTheDocument()
  })

  it('renders the outlet when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Public />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Public Content')).toBeInTheDocument()
  })
})

describe('ModuleRouteGuard', () => {
  const enabledModules = {
    isLoading: false,
    projectManagementEnabled: true,
    employeeManagementEnabled: true,
    documentManagementEnabled: true,
  }

  it('shows a loading state while tenant modules are being loaded', () => {
    mockUseTenantModules.mockReturnValue({ ...enabledModules, isLoading: true })

    render(
      <MemoryRouter initialEntries={['/employees']}>
        <Routes>
          <Route element={<ModuleRouteGuard module="employee" />}>
            <Route path="/employees" element={<div>Employees</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Loading workspace...')
    expect(screen.queryByText('Employees')).not.toBeInTheDocument()
  })

  it.each([
    ['employee', '/employees', 'employeeManagementEnabled'],
    ['project', '/projects', 'projectManagementEnabled'],
  ] as const)('does not render or load a disabled %s module route', (module, path, enabledKey) => {
    const load = vi.fn()
    mockUseTenantModules.mockReturnValue({ ...enabledModules, [enabledKey]: false })

    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route element={<ModuleRouteGuard module={module} />}>
            <Route path={path} element={<ModulePage load={load} />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Module Content')).not.toBeInTheDocument()
    expect(load).not.toHaveBeenCalled()
  })

  it.each([
    ['employee', '/employees'],
    ['project', '/projects'],
  ] as const)('renders and loads an enabled %s module route', async (module, path) => {
    const load = vi.fn()
    mockUseTenantModules.mockReturnValue(enabledModules)

    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ModuleRouteGuard module={module} />}>
            <Route path={path} element={<ModulePage load={load} />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Module Content')).toBeInTheDocument()
    await waitFor(() => expect(load).toHaveBeenCalledOnce())
  })
})

describe('PermissionRoute', () => {
  it('does not mount a denied route or start its data load', () => {
    const load = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { permissions: ['customers.view'] },
    })

    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route element={<PermissionRoute requirement={{ allOf: ['products.view'] }} />}>
            <Route path="/products" element={<ModulePage load={load} />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('routeGuards.permissionDenied')
    expect(screen.queryByText('Module Content')).not.toBeInTheDocument()
    expect(load).not.toHaveBeenCalled()
  })

  it('mounts a route when any required alternative is granted', async () => {
    const load = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { permissions: ['imports.history.view'] },
    })

    render(
      <MemoryRouter initialEntries={['/config/import-data']}>
        <Routes>
          <Route element={<PermissionRoute requirement={{ anyOf: ['imports.validate', 'imports.history.view'] }} />}>
            <Route path="/config/import-data" element={<ModulePage load={load} />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Module Content')).toBeInTheDocument()
    await waitFor(() => expect(load).toHaveBeenCalledOnce())
  })
})
