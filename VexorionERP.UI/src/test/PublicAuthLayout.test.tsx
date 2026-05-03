/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PublicAuthLayout from '../components/PublicAuthLayout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Suppress Outlet warning — we're not rendering children in this test
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, Outlet: () => null }
})

describe('PublicAuthLayout', () => {
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <PublicAuthLayout />
      </MemoryRouter>,
    )
  }

  it('renders the brand name', () => {
    renderAt('/login')
    expect(screen.getByText('app.brand')).toBeInTheDocument()
  })

  it('renders workspace access heading', () => {
    renderAt('/login')
    expect(screen.getByText('publicAuth.workspaceAccess')).toBeInTheDocument()
  })

  it('renders login page content by default', () => {
    renderAt('/login')
    expect(screen.getByText('publicAuth.login.eyebrow')).toBeInTheDocument()
    expect(screen.getByText('publicAuth.login.title')).toBeInTheDocument()
    expect(screen.getByText('publicAuth.login.description')).toBeInTheDocument()
  })

  it('renders tenants page content on /tenants path', () => {
    renderAt('/tenants')
    expect(screen.getByText('publicAuth.tenants.eyebrow')).toBeInTheDocument()
    expect(screen.getByText('publicAuth.tenants.title')).toBeInTheDocument()
  })

  it('renders all three feature rows', () => {
    renderAt('/login')
    expect(screen.getByText('publicAuth.features.sessionResilience.title')).toBeInTheDocument()
    expect(screen.getByText('publicAuth.features.operationalModules.title')).toBeInTheDocument()
    expect(screen.getByText('publicAuth.features.adminFirstUi.title')).toBeInTheDocument()
  })

  it('falls back to login content for unknown paths', () => {
    renderAt('/unknown')
    expect(screen.getByText('publicAuth.login.eyebrow')).toBeInTheDocument()
  })
})
