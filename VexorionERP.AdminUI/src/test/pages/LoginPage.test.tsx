/// <reference types="vitest/globals" />

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    error: null,
    validation: null,
    clearFeedback: vi.fn(),
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => window.sessionStorage.clear())

  function renderPage() {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
  }

  it('does not ship pre-filled credentials', () => {
    renderPage()
    expect(screen.getByLabelText('login.tenantCode')).toHaveValue('')
    expect(screen.getByLabelText('login.emailOrUsername')).toHaveValue('')
    expect(screen.getByLabelText('login.password', { selector: 'input' })).toHaveValue('')
  })

  it('uses sign-in autocomplete attributes', () => {
    renderPage()
    expect(screen.getByLabelText('login.emailOrUsername')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('login.password', { selector: 'input' })).toHaveAttribute('autocomplete', 'current-password')
  })

  it('toggles password visibility', () => {
    renderPage()
    const input = screen.getByLabelText('login.password', { selector: 'input' })
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'login.showPassword' }))
    expect(input).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'login.hidePassword' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('warns when Caps Lock is on', () => {
    renderPage()
    const input = screen.getByLabelText('login.password', { selector: 'input' })
    fireEvent.keyDown(input, { key: 'a', modifierCapsLock: true })
    expect(screen.getByText('login.capsLockOn')).toBeInTheDocument()
    fireEvent.blur(input)
    expect(screen.queryByText('login.capsLockOn')).not.toBeInTheDocument()
  })

  it('shows a notice after a session expired', () => {
    window.sessionStorage.setItem('vexorionerp.admin.sessionExpired', '1')
    renderPage()
    expect(screen.getByText('login.sessionExpired')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('vexorionerp.admin.sessionExpired')).toBeNull()
  })
})
