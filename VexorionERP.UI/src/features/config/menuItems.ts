export type ConfigurableMenuItem = {
  path: string
  label: string
  section: string
}

export const configurableMenuItems: ConfigurableMenuItem[] = [
  { path: '/', label: 'Dashboard', section: 'Overview' },
  { path: '/customers', label: 'Customers', section: 'Sales' },
  { path: '/sales-orders', label: 'Sales orders', section: 'Sales' },
  { path: '/sales-shipments', label: 'Sales shipments', section: 'Sales' },
  { path: '/sales-invoices', label: 'Sales invoices', section: 'Sales' },
  { path: '/customer-payments', label: 'Customer payments', section: 'Sales' },
  { path: '/suppliers', label: 'Suppliers', section: 'Procurement' },
  { path: '/purchase-orders', label: 'Purchase orders', section: 'Procurement' },
  { path: '/purchase-receipts', label: 'Purchase receipts', section: 'Procurement' },
  { path: '/purchase-invoices', label: 'Purchase invoices', section: 'Procurement' },
  { path: '/vendor-payments', label: 'Vendor payments', section: 'Procurement' },
  { path: '/products', label: 'Products', section: 'Inventory' },
  { path: '/inventory-adjustments', label: 'Inventory adjustments', section: 'Inventory' },
  { path: '/stock-counts', label: 'Stock counts', section: 'Inventory' },
  { path: '/stock-transfers', label: 'Stock transfers', section: 'Inventory' },
  { path: '/warehouses', label: 'Warehouses', section: 'Inventory' },
  { path: '/accounts', label: 'Accounts', section: 'Finance' },
  { path: '/audit-logs', label: 'Audit logs', section: 'Finance' },
  { path: '/fiscal-periods', label: 'Fiscal periods', section: 'Finance' },
  { path: '/journals', label: 'Journals', section: 'Finance' },
  { path: '/reports', label: 'Reports', section: 'Finance' },
  { path: '/config', label: 'Config center', section: 'Configuration' },
]
