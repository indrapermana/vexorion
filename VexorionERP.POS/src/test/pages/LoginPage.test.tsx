/// <reference types="vitest/globals" />

import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'
import { fireEvent, renderWithProviders, screen } from '../testUtils'

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    error: null,
    validation: null,
    clearFeedback: vi.fn(),
  }),
}))

describe('POS LoginPage', () => {
  beforeEach(() => window.sessionStorage.clear())

  function renderPage() {
    return renderWithProviders(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
  }

  it('does not ship pre-filled credentials and explains the cashier context', () => {
    renderPage()
    expect(screen.getByLabelText('Tenant code')).toHaveValue('')
    expect(screen.getByLabelText('Username or email')).toHaveValue('')
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveValue('')
    expect(screen.getByText('Sign in to open or continue your register shift.')).toBeInTheDocument()
  })

  it('toggles password visibility and warns about Caps Lock', () => {
    renderPage()
    const input = screen.getByLabelText('Password', { selector: 'input' })
    expect(input).toHaveAttribute('autocomplete', 'current-password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.keyDown(input, { key: 'a', modifierCapsLock: true })
    expect(screen.getByText('Caps Lock is on')).toBeInTheDocument()
  })

  it('shows a notice after a session expired', () => {
    window.sessionStorage.setItem('vexorionerp.pos.sessionExpired', '1')
    renderPage()
    expect(screen.getByText('Your session has ended. Please sign in again.')).toBeInTheDocument()
  })
})
