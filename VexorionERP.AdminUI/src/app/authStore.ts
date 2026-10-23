import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError, getCurrentUser, login as loginRequest, logoutRefreshSession, refreshSession } from '../lib/api'
import { setApiAccessToken, setApiRefreshHandler, setApiUnauthorizedHandler } from '../lib/apiAuth'
import { markSessionExpired } from '../lib/sessionNotice'
import type { AuthState } from '../types/ui'
import i18n from '../i18n'

export type AuthStoreState = AuthState

let initializePromise: Promise<void> | null = null
let refreshPromise: Promise<string | null> | null = null

function clearAuthState() {
  useAuthStore.setState({ session: null, user: null, error: null, validation: null, isLoading: false })
  setApiAccessToken(null)
}

function expireAuthState() {
  if (useAuthStore.getState().session) {
    markSessionExpired()
  }
  clearAuthState()
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const { session } = useAuthStore.getState()
    if (!session?.refreshToken) {
      clearAuthState()
      return null
    }

    try {
      const nextSession = await refreshSession(session.refreshToken)
      setApiAccessToken(nextSession.accessToken)
      useAuthStore.setState({ session: nextSession })
      return nextSession.accessToken
    } catch {
      expireAuthState()
      return null
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      isLoading: true,
      error: null,
      validation: null,
      initialize: async () => {
        if (initializePromise) {
          return initializePromise
        }

        initializePromise = (async () => {
          const { session } = get()
          if (!session?.accessToken) {
            setApiAccessToken(null)
            set({ isLoading: false, user: null })
            return
          }

          try {
            setApiAccessToken(session.accessToken)
            const user = await getCurrentUser()
            set({ user, isLoading: false })
          } catch {
            expireAuthState()
          }
        })()

        try {
          await initializePromise
        } finally {
          initializePromise = null
        }
      },
      login: async (request) => {
        set({ error: null, validation: null })

        try {
          const session = await loginRequest(request)
          setApiAccessToken(session.accessToken)
          const user = await getCurrentUser()
          set({ session, user, error: null, validation: null })
        } catch (error) {
          if (error instanceof ApiError) {
            set({ error: error.message, validation: error.validation ?? null })
          } else {
            set({ error: i18n.t('login.error'), validation: null })
          }

          throw error
        }
      },
      logout: async () => {
        const refreshToken = get().session?.refreshToken

        try {
          if (refreshToken) {
            await logoutRefreshSession(refreshToken)
          }
        } finally {
          clearAuthState()
        }
      },
      refreshUser: async () => {
        const { session } = get()
        if (!session?.accessToken) {
          setApiAccessToken(null)
          set({ user: null })
          return
        }

        setApiAccessToken(session.accessToken)
        const user = await getCurrentUser()
        set({ user })
      },
      clearFeedback: () => {
        set({ error: null, validation: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ session: state.session }),
    },
  ),
)

setApiRefreshHandler(refreshAccessToken)
setApiUnauthorizedHandler(expireAuthState)
