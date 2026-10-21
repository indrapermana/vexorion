export const PosPermissions = {
  customers: { view: 'customers.view', manage: 'customers.manage' },
  products: { view: 'products.view' },
  inventory: { view: 'inventory.view' },
  sales: { view: 'sales.view', manage: 'sales.manage' },
  roles: { manage: 'roles.manage' },
  checkout: 'pos.checkout',
  refund: 'pos.refund',
  reprint: 'pos.reprint',
  shiftClose: 'pos.shift_close',
} as const

export const posWorkspacePermissions = [
  PosPermissions.customers.view,
  PosPermissions.products.view,
  PosPermissions.inventory.view,
  PosPermissions.sales.view,
] as const

export function hasAllPosPermissions(grantedPermissions: readonly string[] | undefined, required: readonly string[]) {
  const granted = new Set(grantedPermissions ?? [])
  return required.every((permission) => granted.has(permission))
}
