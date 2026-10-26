export const Permissions = {
  users: { view: 'users.view', manage: 'users.manage' },
  roles: { view: 'roles.view', manage: 'roles.manage' },
  customers: { view: 'customers.view', manage: 'customers.manage' },
  suppliers: { view: 'suppliers.view', manage: 'suppliers.manage' },
  products: { view: 'products.view', manage: 'products.manage' },
  projects: { view: 'projects.view', manage: 'projects.manage' },
  organization: { view: 'organization.view', manage: 'organization.manage' },
  sales: { view: 'sales.view', manage: 'sales.manage' },
  purchasing: { view: 'purchasing.view', manage: 'purchasing.manage' },
  inventory: { view: 'inventory.view', manage: 'inventory.manage' },
  accounting: { view: 'accounting.view', manage: 'accounting.manage' },
  reports: { view: 'reports.view' },
  billing: { view: 'billing.view', manage: 'billing.manage' },
  payments: { view: 'payments.view', manage: 'payments.manage' },
  imports: { validate: 'imports.validate', submit: 'imports.submit', history: 'imports.history.view' },
  projectDocuments: {
    view: 'project-documents.view',
    upload: 'project-documents.upload',
    download: 'project-documents.download',
    manage: 'project-documents.manage',
  },
  tenants: { view: 'tenants.view', manage: 'tenants.manage' },
  tenantModules: { view: 'tenant-modules.view', manage: 'tenant-modules.manage' },
  storageUsage: { view: 'storage-usage.view' },
} as const

export type PermissionRequirement = {
  allOf?: readonly string[]
  anyOf?: readonly string[]
}

export type MainRouteAccess = {
  match: (pathname: string) => boolean
  requirement: PermissionRequirement
  actionRequirement?: PermissionRequirement
}

export const mainRouteAccess: ReadonlyArray<MainRouteAccess> = [
  { match: (path) => path === '/', requirement: { allOf: [Permissions.reports.view] } },
  { match: (path) => path === '/customers', requirement: { allOf: [Permissions.customers.view] }, actionRequirement: { allOf: [Permissions.customers.manage] } },
  { match: (path) => ['/sales-orders', '/sales-shipments', '/sales-invoices'].includes(path), requirement: { allOf: [Permissions.sales.view] }, actionRequirement: { allOf: [Permissions.sales.manage] } },
  { match: (path) => path === '/customer-payments', requirement: { allOf: [Permissions.sales.view] }, actionRequirement: { allOf: [Permissions.sales.manage] } },
  { match: (path) => path === '/suppliers', requirement: { allOf: [Permissions.suppliers.view] }, actionRequirement: { allOf: [Permissions.suppliers.manage] } },
  { match: (path) => ['/purchase-orders', '/purchase-receipts', '/purchase-invoices'].includes(path), requirement: { allOf: [Permissions.purchasing.view] }, actionRequirement: { allOf: [Permissions.purchasing.manage] } },
  { match: (path) => path === '/vendor-payments', requirement: { allOf: [Permissions.purchasing.view] }, actionRequirement: { allOf: [Permissions.purchasing.manage] } },
  { match: (path) => path === '/products' || path === '/config/product-categories', requirement: { allOf: [Permissions.products.view] }, actionRequirement: { allOf: [Permissions.products.manage] } },
  { match: (path) => path === '/inventory-reports', requirement: { allOf: [Permissions.inventory.view] } },
  { match: (path) => ['/inventory-adjustments', '/stock-counts', '/stock-transfers', '/warehouses'].includes(path), requirement: { allOf: [Permissions.inventory.view] }, actionRequirement: { allOf: [Permissions.inventory.manage] } },
  { match: (path) => ['/accounts', '/fiscal-periods', '/journals', '/config/numbering'].includes(path), requirement: { allOf: [Permissions.billing.view] }, actionRequirement: { allOf: [Permissions.billing.manage] } },
  { match: (path) => path === '/config/tax-discount', requirement: { allOf: [Permissions.accounting.view, Permissions.organization.view] }, actionRequirement: { anyOf: [Permissions.accounting.manage, Permissions.organization.manage] } },
  { match: (path) => path === '/audit-logs', requirement: { allOf: [Permissions.accounting.view] } },
  { match: (path) => path === '/reports', requirement: { allOf: [Permissions.reports.view] } },
  { match: (path) => ['/project-categories', '/projects'].includes(path) || path.startsWith('/projects/'), requirement: { allOf: [Permissions.projects.view] }, actionRequirement: { allOf: [Permissions.projects.manage] } },
  { match: (path) => path === '/project-documents', requirement: { allOf: [Permissions.projectDocuments.view] } },
  { match: (path) => ['/employees', '/consultants', '/config/company', '/config/menu'].includes(path), requirement: { allOf: [Permissions.organization.view] }, actionRequirement: { allOf: [Permissions.organization.manage] } },
  { match: (path) => path === '/tenant-relationships', requirement: { allOf: [Permissions.tenants.view] }, actionRequirement: { allOf: [Permissions.tenants.manage] } },
  { match: (path) => path === '/config/users', requirement: { allOf: [Permissions.users.view] }, actionRequirement: { anyOf: [Permissions.users.manage, Permissions.roles.manage] } },
  { match: (path) => path === '/config/roles', requirement: { allOf: [Permissions.roles.view] }, actionRequirement: { allOf: [Permissions.roles.manage] } },
  { match: (path) => path === '/config/import-data', requirement: { anyOf: [Permissions.imports.validate, Permissions.imports.history] }, actionRequirement: { allOf: [Permissions.imports.submit] } },
  {
    match: (path) => path === '/config',
    requirement: {
      anyOf: [
        Permissions.users.view,
        Permissions.roles.view,
        Permissions.organization.view,
        Permissions.accounting.view,
        Permissions.billing.view,
        Permissions.products.view,
        Permissions.imports.validate,
        Permissions.imports.history,
      ],
    },
  },
]

export function hasRequiredPermissions(
  grantedPermissions: readonly string[] | undefined,
  requirement: PermissionRequirement,
) {
  const granted = new Set(grantedPermissions ?? [])
  const hasAll = !requirement.allOf || requirement.allOf.every((permission) => granted.has(permission))
  const hasAny = !requirement.anyOf || requirement.anyOf.some((permission) => granted.has(permission))
  return hasAll && hasAny
}

export function canAccessMainRoute(grantedPermissions: readonly string[] | undefined, pathname: string) {
  const route = mainRouteAccess.find((entry) => entry.match(pathname))
  return route ? hasRequiredPermissions(grantedPermissions, route.requirement) : false
}

export function canPerformMainRouteActions(grantedPermissions: readonly string[] | undefined, pathname: string) {
  const route = mainRouteAccess.find((entry) => entry.match(pathname))
  return Boolean(route?.actionRequirement && hasRequiredPermissions(grantedPermissions, route.actionRequirement))
}

export type MainMenuModules = {
  isLoading: boolean
  isError?: boolean
  projectManagementEnabled: boolean
  documentManagementEnabled: boolean
  employeeManagementEnabled: boolean
}

export function getMainMenuAccess(
  grantedPermissions: readonly string[] | undefined,
  pathname: string,
  hiddenLinks: readonly string[],
  modules: MainMenuModules,
) {
  const permissionAllowed = canAccessMainRoute(grantedPermissions, pathname)
  const preferenceVisible = !hiddenLinks.includes(pathname)
  const projectRequired = ['/project-categories', '/project-documents', '/projects', '/tenant-relationships'].includes(pathname) || pathname.startsWith('/projects/')
  const employeeRequired = ['/employees', '/consultants'].includes(pathname)
  const moduleRequired = projectRequired || employeeRequired
  const moduleEnabled = (!projectRequired || modules.projectManagementEnabled) && (!employeeRequired || modules.employeeManagementEnabled)
  const moduleStatus = !moduleRequired ? 'notRequired' : modules.isLoading ? 'loading' : modules.isError ? 'unavailable' : moduleEnabled ? 'enabled' : 'disabled'
  const routeAvailable = permissionAllowed && (moduleStatus === 'notRequired' || moduleStatus === 'enabled')
  const status = !permissionAllowed ? 'permissionDenied' : moduleStatus === 'loading' ? 'moduleLoading' : moduleStatus === 'unavailable' ? 'moduleUnavailable' : moduleStatus === 'disabled' ? 'moduleDisabled' : !preferenceVisible ? 'hidden' : 'visible'
  return { permissionAllowed, preferenceVisible, moduleStatus, routeAvailable, status, visible: routeAvailable && preferenceVisible }
}
