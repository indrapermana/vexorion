import type { CurrentUserResponse, LoginRequest, LoginResponse } from '../../types/api'
import { requestJson } from './core'

export function login(request: LoginRequest) {
  return requestJson<LoginResponse>('/auth/login', 'POST', request)
}

export function refreshSession(refreshToken: string) {
  return requestJson<LoginResponse>('/auth/refresh', 'POST', { refreshToken })
}

export function logoutRefreshSession(refreshToken: string) {
  return requestJson<void>('/auth/logout-refresh', 'POST', { refreshToken })
}

export function getCurrentUser() {
  return requestJson<CurrentUserResponse>('/auth/me')
}
