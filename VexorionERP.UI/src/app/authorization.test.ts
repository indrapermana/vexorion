import { describe, expect, it } from 'vitest'
import { Permissions, canAccessMainRoute, canPerformMainRouteActions, hasRequiredPermissions } from './authorization'

describe('main authorization matrix', () => {
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
