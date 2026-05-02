const menuConfigStorageKey = 'adminui.tenantMenuConfig'

export const tenantMenuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'customers', label: 'Customers' },
  { key: 'products', label: 'Products' },
  { key: 'sales-orders', label: 'Sales Orders' },
  { key: 'sales-invoices', label: 'Sales Invoices' },
  { key: 'purchase-orders', label: 'Purchase Orders' },
  { key: 'reports', label: 'Reports' },
] as const

export type MenuItemKey = (typeof tenantMenuItems)[number]['key']
export type TenantMenuConfigMap = Record<string, MenuItemKey[]>

function readConfigMap(): TenantMenuConfigMap {
  const raw = localStorage.getItem(menuConfigStorageKey)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as TenantMenuConfigMap
  } catch {
    return {}
  }
}

function saveConfigMap(configMap: TenantMenuConfigMap) {
  localStorage.setItem(menuConfigStorageKey, JSON.stringify(configMap))
}

export function getTenantHiddenMenus(tenantId: string): MenuItemKey[] {
  const configMap = readConfigMap()
  return configMap[tenantId] ?? []
}

export function saveTenantHiddenMenus(tenantId: string, hiddenMenus: MenuItemKey[]) {
  const configMap = readConfigMap()
  configMap[tenantId] = hiddenMenus
  saveConfigMap(configMap)
}
