import { describe, expect, it } from 'vitest'
import { Permissions, canAccessMainRoute, canPerformMainRouteActions, getMainMenuAccess, hasRequiredPermissions } from './authorization'

describe('main authorization matrix', () => {
  const modules = { isLoading: false, projectManagementEnabled: true, documentManagementEnabled: true, employeeManagementEnabled: true }

  it('distinguishes a hidden menu preference from route access', () => {
    const access = getMainMenuAccess([Permissions.projects.view], '/projects', ['/projects'], modules)
    expect(access.status).toBe('hidden')
    expect(access.routeAvailable).toBe(true)
    expect(access.visible).toBe(false)
    expect(canAccessMainRoute([Permissions.projects.view], '/projects')).toBe(true)
  })

  it('does not let a shown preference override module or permission restrictions', () => {
    expect(getMainMenuAccess([Permissions.projects.view], '/projects', [], { ...modules, projectManagementEnabled: false }).status).toBe('moduleDisabled')
    expect(getMainMenuAccess([], '/projects', [], modules).status).toBe('permissionDenied')
    expect(getMainMenuAccess([], '/projects', [], modules).visible).toBe(false)
  })

  it('distinguishes unresolved module configuration without blocking unrelated routes', () => {
    expect(getMainMenuAccess([Permissions.projects.view], '/projects', [], { ...modules, isLoading: true }).status).toBe('moduleLoading')
    expect(getMainMenuAccess([Permissions.projects.view], '/projects', [], { ...modules, isError: true }).status).toBe('moduleUnavailable')
    expect(getMainMenuAccess([Permissions.customers.view], '/customers', [], { ...modules, isLoading: true }).visible).toBe(true)
  })

  it('matches the project-document and employee gates registered by the router', () => {
    expect(getMainMenuAccess([Permissions.projectDocuments.view], '/project-documents', [], { ...modules, projectManagementEnabled: false }).status).toBe('moduleDisabled')
    expect(getMainMenuAccess([Permissions.projectDocuments.view], '/project-documents', [], { ...modules, documentManagementEnabled: false }).visible).toBe(true)
    expect(getMainMenuAccess([Permissions.organization.view], '/employees', [], { ...modules, employeeManagementEnabled: false }).status).toBe('moduleDisabled')
    expect(getMainMenuAccess([Permissions.projects.view], '/projects', [], { ...modules, documentManagementEnabled: false }).visible).toBe(true)
  })

  it('requires the view permission assigned to a route', () => {
    expect(canAccessMainRoute([Permissions.products.view], '/products')).toBe(true)
    expect(canAccessMainRoute([Permissions.customers.view], '/products')).toBe(false)
  })

  it('matches payment workspaces to their backend sales and purchasing policies', () => {
    expect(canAccessMainRoute([Permissions.sales.view], '/customer-payments')).toBe(true)
    expect(canAccessMainRoute([Permissions.payments.view], '/customer-payments')).toBe(false)
    expect(canAccessMainRoute([Permissions.purchasing.view], '/vendor-payments')).toBe(true)
    expect(canAccessMainRoute([Permissions.payments.view], '/vendor-payments')).toBe(false)
  })

  it('requires both tax-code and preference read permissions for tax and discount configuration', () => {
    expect(canAccessMainRoute([Permissions.accounting.view, Permissions.organization.view], '/config/tax-discount')).toBe(true)
    expect(canAccessMainRoute([Permissions.accounting.view], '/config/tax-discount')).toBe(false)
  })

  it('recognizes either scoped manage permission on the combined tax and discount page', () => {
    expect(canPerformMainRouteActions([Permissions.accounting.manage], '/config/tax-discount')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.organization.manage], '/config/tax-discount')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.accounting.view, Permissions.organization.view], '/config/tax-discount')).toBe(false)
    expect(canAccessMainRoute([Permissions.billing.view], '/config/numbering')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.billing.manage], '/config/numbering')).toBe(true)
  })

  it('recognizes user-lifecycle and role-assignment actions independently', () => {
    expect(canPerformMainRouteActions([Permissions.users.manage], '/config/users')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.roles.manage], '/config/users')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.users.view], '/config/users')).toBe(false)
  })

  it('accepts either import permission for the import workspace', () => {
    expect(canAccessMainRoute([Permissions.imports.validate], '/config/import-data')).toBe(true)
    expect(canAccessMainRoute([Permissions.imports.history], '/config/import-data')).toBe(true)
  })

  it('supports combined all-of and any-of requirements', () => {
    expect(hasRequiredPermissions(['one', 'two'], { allOf: ['one'], anyOf: ['two', 'three'] })).toBe(true)
    expect(hasRequiredPermissions(['one'], { allOf: ['one'], anyOf: ['two', 'three'] })).toBe(false)
  })

  it('keeps route visibility separate from mutation permission', () => {
    expect(canAccessMainRoute([Permissions.customers.view], '/customers')).toBe(true)
    expect(canPerformMainRouteActions([Permissions.customers.view], '/customers')).toBe(false)
    expect(canPerformMainRouteActions([Permissions.customers.manage], '/customers')).toBe(true)
  })
})
