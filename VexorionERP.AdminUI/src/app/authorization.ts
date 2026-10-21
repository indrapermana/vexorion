export const AdminPermissions = {
  tenants: { view: 'tenants.view', manage: 'tenants.manage' },
  users: { view: 'users.view', manage: 'users.manage' },
  roles: { view: 'roles.view', manage: 'roles.manage' },
} as const

export type AdminPermissionRequirement = {
  allOf?: readonly string[]
  anyOf?: readonly string[]
}

export const adminRouteRequirements: Readonly<Record<string, AdminPermissionRequirement>> = {
  '/': { allOf: [AdminPermissions.tenants.view, AdminPermissions.users.view] },
  '/tenants': { allOf: [AdminPermissions.tenants.view] },
  '/users': { allOf: [AdminPermissions.users.view] },
  '/menu-configuration': { allOf: [AdminPermissions.tenants.view] },
}

export function hasAdminPermissions(
  grantedPermissions: readonly string[] | undefined,
  requirement: AdminPermissionRequirement,
) {
  const granted = new Set(grantedPermissions ?? [])
  return (!requirement.allOf || requirement.allOf.every((permission) => granted.has(permission)))
    && (!requirement.anyOf || requirement.anyOf.some((permission) => granted.has(permission)))
}

export function canAccessAdminRoute(grantedPermissions: readonly string[] | undefined, pathname: string) {
  const requirement = adminRouteRequirements[pathname]
  return requirement ? hasAdminPermissions(grantedPermissions, requirement) : false
}
