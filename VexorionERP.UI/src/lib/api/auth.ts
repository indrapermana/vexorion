import type { CurrentUserResponse, LoginRequest, LoginResponse } from '../../types/api'
import { requestJson } from './core'

export function login(request: LoginRequest) {
  return requestJson<LoginResponse>('/auth/login', 'POST', request)
}

export function requestPasswordReset(request: { tenantCode: string; userNameOrEmail: string; locale?: string }) {
  return requestJson<void>('/auth/forgot-password', 'POST', request)
}

export function validatePasswordResetToken(token: string) {
  return requestJson<void>('/auth/reset-password/validate', 'POST', { token })
}

export function completePasswordReset(request: { token: string; newPassword: string; confirmPassword: string; locale?: string }) {
  return requestJson<void>('/auth/reset-password', 'POST', request)
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