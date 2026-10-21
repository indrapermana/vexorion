import { describe, expect, it } from 'vitest'
import { AdminPermissions, canAccessAdminRoute, hasAdminPermissions } from './authorization'

describe('admin authorization matrix', () => {
  it('maps admin routes to their read permissions', () => {
    expect(canAccessAdminRoute([AdminPermissions.tenants.view], '/tenants')).toBe(true)
    expect(canAccessAdminRoute([AdminPermissions.users.view], '/tenants')).toBe(false)
  })

  it('requires both dashboard permissions', () => {
    expect(canAccessAdminRoute([AdminPermissions.tenants.view, AdminPermissions.users.view], '/')).toBe(true)
    expect(canAccessAdminRoute([AdminPermissions.tenants.view], '/')).toBe(false)
  })

  it('does not confuse view and manage permissions', () => {
    expect(hasAdminPermissions([AdminPermissions.users.view], { allOf: [AdminPermissions.users.manage] })).toBe(false)
  })
})
