import { describe, expect, it } from 'vitest'
import { getTenantHiddenMenus, saveTenantHiddenMenus, tenantMenuItems } from '../../lib/menuConfig'

describe('menuConfig', () => {
  it('returns an empty array when a tenant has no saved configuration', () => {
    expect(getTenantHiddenMenus('tenant-a')).toEqual([])
  })

  it('persists and reads tenant-specific hidden menus', () => {
    saveTenantHiddenMenus('tenant-a', ['dashboard', 'reports'])
    saveTenantHiddenMenus('tenant-b', ['customers'])

    expect(getTenantHiddenMenus('tenant-a')).toEqual(['dashboard', 'reports'])
    expect(getTenantHiddenMenus('tenant-b')).toEqual(['customers'])
  })

  it('falls back to an empty array when stored JSON is invalid', () => {
    localStorage.setItem('adminui.tenantMenuConfig', '{bad json')

    expect(getTenantHiddenMenus('tenant-a')).toEqual([])
  })

  it('keeps menu keys aligned with the exposed menu list', () => {
    expect(tenantMenuItems.map((item) => item.key)).toEqual([
      'dashboard',
      'customers',
      'products',
      'sales-orders',
      'sales-invoices',
      'purchase-orders',
      'reports',
    ])
  })
})