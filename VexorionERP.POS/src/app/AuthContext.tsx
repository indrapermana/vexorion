import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from './authStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return <>{children}</>
}

export function useAuth() {
  const session = useAuthStore((state) => state.session)
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const validation = useAuthStore((state) => state.validation)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const extendSession = useAuthStore((state) => state.extendSession)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const clearFeedback = useAuthStore((state) => state.clearFeedback)

  return {
    session,
    user,
    isLoading,
    isAuthenticated: Boolean(session?.accessToken),
    error,
    validation,
    login,
    logout,
    extendSession,
    refreshUser,
    clearFeedback,
  }
}
