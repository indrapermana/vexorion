import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionTimeoutWarning } from '../../components/SessionTimeoutWarning'
import { fireEvent, renderWithProviders, screen, waitFor } from '../testUtils'

const auth = vi.hoisted(() => ({
  extendSession: vi.fn<() => Promise<boolean>>(),
  logout: vi.fn<() => Promise<void>>(),
  session: {
    accessToken: 'token',
    refreshToken: 'refresh-token',
    expiresAtUtc: new Date(Date.now() + 2 * 60_000).toISOString(),
    refreshTokenExpiresAtUtc: new Date(Date.now() + 60 * 60_000).toISOString(),
  },
}))

vi.mock('../../app/AuthContext', () => ({
  useAuth: () => ({
    session: auth.session,
    isAuthenticated: true,
    logout: auth.logout,
    extendSession: auth.extendSession,
  }),
}))

describe('SessionTimeoutWarning', () => {
  beforeEach(() => {
    auth.extendSession.mockReset()
    auth.extendSession.mockResolvedValue(true)
    auth.logout.mockReset()
    auth.logout.mockResolvedValue()
  })

  it('warns about an uncertain in-flight transaction and really refreshes the session', async () => {
    renderWithProviders(<SessionTimeoutWarning />)

    expect(screen.getByRole('dialog')).toHaveTextContent('do not start the sale again')
    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }))

    await waitFor(() => expect(auth.extendSession).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
