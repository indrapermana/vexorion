import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from './authStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  useTranslation()
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
    refreshUser,
    clearFeedback,
  }
}