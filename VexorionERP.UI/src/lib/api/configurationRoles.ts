import type { RolePermissionsResponse } from '../../types/api'
import { requestJson } from './core'

export function getRolePermissions() {
  return requestJson<RolePermissionsResponse[]>('/roles')
}
