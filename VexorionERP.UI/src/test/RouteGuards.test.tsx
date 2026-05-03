/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '../components/RouteGuards'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockUseAuth = vi.fn()
vi.mock('../app/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function Protected() {
  return <div>Protected Content</div>
}
function Public() {
  return <div>Public Content</div>
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
    expect(screen.getByText('routeGuards.loadingWorkspace')).toBeInTheDocument()
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
