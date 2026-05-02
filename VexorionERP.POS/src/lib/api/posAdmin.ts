import type { AssignUserRolesRequest, UserListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getUsers() {
  return requestJson<UserListItemResponse[]>('/users')
}

export function assignUserRoles(userId: string, request: AssignUserRolesRequest) {
  return requestJson<void>(`/roles/users/${userId}`, 'PUT', request)
}
