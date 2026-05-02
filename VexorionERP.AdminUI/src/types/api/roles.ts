export type RolePermissionsResponse = {
  role: string
  permissions: string[]
}

export type AssignUserRolesRequest = {
  roles: string[]
}
