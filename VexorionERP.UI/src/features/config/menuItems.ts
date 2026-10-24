export type ConfigurableMenuItem = {
  path: string
  label: string
  section: string
}

export const configurableMenuItems: ConfigurableMenuItem[] = [
  { path: '/', label: 'nav.links.dashboard', section: 'nav.sections.overview' },
  { path: '/customers', label: 'nav.links.customers', section: 'nav.sections.sales' },
  { path: '/sales-orders', label: 'nav.links.salesOrders', section: 'nav.sections.sales' },
  { path: '/sales-shipments', label: 'nav.links.salesShipments', section: 'nav.sections.sales' },
  { path: '/sales-invoices', label: 'nav.links.salesInvoices', section: 'nav.sections.sales' },
  { path: '/customer-payments', label: 'nav.links.customerPayments', section: 'nav.sections.sales' },
  { path: '/suppliers', label: 'nav.links.suppliers', section: 'nav.sections.procurement' },
  { path: '/purchase-orders', label: 'nav.links.purchaseOrders', section: 'nav.sections.procurement' },
  { path: '/purchase-receipts', label: 'nav.links.purchaseReceipts', section: 'nav.sections.procurement' },
  { path: '/purchase-invoices', label: 'nav.links.purchaseInvoices', section: 'nav.sections.procurement' },
  { path: '/vendor-payments', label: 'nav.links.vendorPayments', section: 'nav.sections.procurement' },
  { path: '/products', label: 'nav.links.products', section: 'nav.sections.inventory' },
  { path: '/inventory-adjustments', label: 'nav.links.inventoryAdjustments', section: 'nav.sections.inventory' },
  { path: '/stock-counts', label: 'nav.links.stockCounts', section: 'nav.sections.inventory' },
  { path: '/stock-transfers', label: 'nav.links.stockTransfers', section: 'nav.sections.inventory' },
  { path: '/warehouses', label: 'nav.links.warehouses', section: 'nav.sections.inventory' },
  { path: '/accounts', label: 'nav.links.accounts', section: 'nav.sections.finance' },
  { path: '/audit-logs', label: 'nav.links.auditLogs', section: 'nav.sections.finance' },
  { path: '/fiscal-periods', label: 'nav.links.fiscalPeriods', section: 'nav.sections.finance' },
  { path: '/journals', label: 'nav.links.journals', section: 'nav.sections.finance' },
  { path: '/reports', label: 'nav.links.reports', section: 'nav.sections.finance' },
  { path: '/project-categories', label: 'nav.links.projectCategories', section: 'nav.sections.projects' },
  { path: '/project-documents', label: 'nav.links.projectDocuments', section: 'nav.sections.projects' },
  { path: '/projects', label: 'nav.links.projects', section: 'nav.sections.projects' },
  { path: '/employees', label: 'nav.links.employees', section: 'nav.sections.projects' },
  { path: '/consultants', label: 'nav.links.consultants', section: 'nav.sections.projects' },
  { path: '/tenant-relationships', label: 'nav.links.tenantRelationships', section: 'nav.sections.projects' },
  { path: '/config', label: 'nav.links.configCenter', section: 'nav.sections.configuration' },
]
