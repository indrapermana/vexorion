import type {
  AssignUserRolesRequest,
  CreateUserRequest,
  DisableUserRequest,
  UserListItemResponse,
} from '../../types/api'
import { requestJson } from './core'

export function getUsers() {
  return requestJson<UserListItemResponse[]>('/users')
}

export function createUser(request: CreateUserRequest) {
  return requestJson<UserListItemResponse>('/users', 'POST', request)
}

export function setUserStatus(userId: string, request: DisableUserRequest) {
  return requestJson<void>(`/users/${userId}/status`, 'PATCH', request)
}

export function assignUserRoles(userId: string, request: AssignUserRolesRequest) {
  return requestJson<void>(`/roles/users/${userId}`, 'PUT', request)
}
