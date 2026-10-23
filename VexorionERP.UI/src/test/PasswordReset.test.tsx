/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import { ApiError } from '../lib/api'

const api = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  validatePasswordResetToken: vi.fn(),
  completePasswordReset: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'id-ID' } }),
}))

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  ...api,
}))

describe('password reset pages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a generic confirmation after requesting a link', async () => {
    api.requestPasswordReset.mockResolvedValue(undefined)
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText(/pages.auth.login.tenantCode/), { target: { value: 'acme' } })
    fireEvent.change(screen.getByLabelText(/pages.auth.login.usernameOrEmail/), { target: { value: 'bob+1@gmail.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'pages.auth.forgotPassword.submit' }))

    expect(await screen.findByText('pages.auth.forgotPassword.sentMessage')).toBeInTheDocument()
    expect(api.requestPasswordReset).toHaveBeenCalledWith({ tenantCode: 'acme', userNameOrEmail: 'bob+1@gmail.com', locale: 'id' })
  })

  function renderReset(url: string) {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('shows the invalid state when the link has no token or the token is rejected', async () => {
    renderReset('/reset-password')
    expect(await screen.findByText('pages.auth.resetPassword.invalidMessage')).toBeInTheDocument()

    api.validatePasswordResetToken.mockRejectedValue(new ApiError(400, 'bad', 'auth.reset_token_invalid'))
    renderReset('/reset-password?token=abc')
    await waitFor(() => expect(screen.getAllByText('pages.auth.resetPassword.invalidMessage')).toHaveLength(2))
  })

  it('blocks mismatched passwords and goes to sign-in after a successful reset', async () => {
    api.validatePasswordResetToken.mockResolvedValue(undefined)
    api.completePasswordReset.mockResolvedValue(undefined)
    renderReset('/reset-password?token=abc')

    const newPassword = await screen.findByLabelText('pages.auth.resetPassword.newPassword', { selector: 'input' })
    const confirm = screen.getByLabelText('pages.auth.resetPassword.confirmPassword', { selector: 'input' })
    const submit = screen.getByRole('button', { name: 'pages.auth.resetPassword.submit' })

    fireEvent.change(newPassword, { target: { value: 'NewPass123' } })
    fireEvent.change(confirm, { target: { value: 'Different1' } })
    expect(screen.getByText('pages.auth.resetPassword.mismatch')).toBeInTheDocument()
    expect(submit).toBeDisabled()

    fireEvent.change(confirm, { target: { value: 'NewPass123' } })
    fireEvent.click(submit)

    expect(await screen.findByText('login-page')).toBeInTheDocument()
    expect(api.completePasswordReset).toHaveBeenCalledWith({ token: 'abc', newPassword: 'NewPass123', confirmPassword: 'NewPass123', locale: 'id' })
  })
})
