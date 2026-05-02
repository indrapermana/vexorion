import { requestJson } from './core'
import type { CreateUserRequest, DisableUserRequest, ResetPasswordRequest, UserListItemResponse } from '../../types/api/users'

export function getUsers() {
  return requestJson<UserListItemResponse[]>('/users')
}

export function getUsersForAdmin(tenantId?: string) {
  const params = new URLSearchParams()
  if (tenantId) {
    params.set('tenantId', tenantId)
  }

  const query = params.toString()
  return requestJson<UserListItemResponse[]>(query.length > 0 ? `/users/admin?${query}` : '/users/admin')
}

export function createUser(request: CreateUserRequest) {
  return requestJson<UserListItemResponse>('/users', 'POST', request)
}

export function setUserStatus(userId: string, request: DisableUserRequest) {
  return requestJson<void>(`/users/${userId}/status`, 'PATCH', request)
}

export function resetUserPassword(userId: string, request: ResetPasswordRequest) {
  return requestJson<void>(`/users/${userId}/reset-password`, 'POST', request)
}
