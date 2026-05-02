import { requestJson } from './core'
import type { AssignUserRolesRequest, RolePermissionsResponse } from '../../types/api/roles'

export function getRoles() {
  return requestJson<RolePermissionsResponse[]>('/roles')
}

export function assignUserRoles(userId: string, request: AssignUserRolesRequest) {
  return requestJson<void>(`/roles/users/${userId}`, 'PUT', request)
}
