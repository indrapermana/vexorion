import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
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
    user: null,
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

import { ProtectedRoute, PublicOnlyRoute } from '../../components/RouteGuards'

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

    renderProtectedRoute()

    expect(screen.getByText('Protected content')).toBeInTheDocument()
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
})