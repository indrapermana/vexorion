import { requestJson } from './core'
import type { AuthLoginRequest, AuthSessionResponse, CurrentUserResponse } from '../../types/api'

export function login(request: AuthLoginRequest) {
  return requestJson<AuthSessionResponse>('/auth/login', 'POST', request)
}

export function getCurrentUser() {
  return requestJson<CurrentUserResponse>('/auth/me')
}

export function refreshSession(refreshToken: string) {
  return requestJson<AuthSessionResponse>('/auth/refresh', 'POST', { refreshToken })
}

export function logoutRefreshSession(refreshToken: string) {
  return requestJson<void>('/auth/logout', 'POST', { refreshToken })
}
