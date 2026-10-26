import './App.css'
import { Suspense, lazy } from 'react'
import { VxAlert } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, Route, Routes, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { CurrencyProvider } from './app/CurrencyContext'
import { TenantModuleProvider } from './app/TenantModuleContext'
import { ModuleRouteGuard, PermissionRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { Permissions } from './app/authorization'
import { UnsavedChangesNavigationGuard } from './hooks/useUnsavedChangesPrompt'

const AppLayout = lazy(() => import('./components/AppLayout'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'))
const ConfigCompanyPage = lazy(() => import('./pages/ConfigCompanyPage'))
const ConfigImportDataPage = lazy(() => import('./pages/ConfigImportDataPage'))
const ConfigProductCategoriesPage = lazy(() => import('./pages/ConfigProductCategoriesPage'))
const ConfigMenuPage = lazy(() => import('./pages/ConfigMenuPage'))
const ConfigNumberingPage = lazy(() => import('./pages/ConfigNumberingPage'))
const ConfigPage = lazy(() => import('./pages/ConfigPage'))
const ConfigRolesPage = lazy(() => import('./pages/ConfigRolesPage'))
const ConfigTaxDiscountPage = lazy(() => import('./pages/ConfigTaxDiscountPage'))
const ConfigUsersPage = lazy(() => import('./pages/ConfigUsersPage'))
const PublicAuthLayout = lazy(() => import('./components/PublicAuthLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const CustomerPaymentsPage = lazy(() => import('./pages/CustomerPaymentsPage'))
const FiscalPeriodsPage = lazy(() => import('./pages/FiscalPeriodsPage'))
const JournalsPage = lazy(() => import('./pages/JournalsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const InventoryAdjustmentsPage = lazy(() => import('./pages/InventoryAdjustmentsPage'))
const InventoryReportsPage = lazy(() => import('./pages/InventoryReportsPage'))
const PurchaseInvoicesPage = lazy(() => import('./pages/PurchaseInvoicesPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const PurchaseReceiptsPage = lazy(() => import('./pages/PurchaseReceiptsPage'))
const SalesShipmentsPage = lazy(() => import('./pages/SalesShipmentsPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const ProjectCategoriesPage = lazy(() => import('./pages/ProjectCategoriesPage'))
const ProjectDocumentsPage = lazy(() => import('./pages/ProjectDocumentsPage'))
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SalesInvoicesPage = lazy(() => import('./pages/SalesInvoicesPage'))
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'))
const StockCountsPage = lazy(() => import('./pages/StockCountsPage'))
const StockTransfersPage = lazy(() => import('./pages/StockTransfersPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const ConsultantsPage = lazy(() => import('./pages/ConsultantsPage'))
const TenantRelationshipsPage = lazy(() => import('./pages/TenantRelationshipsPage'))
const TenantsPage = lazy(() => import('./pages/TenantsPage'))
const VendorPaymentsPage = lazy(() => import('./pages/VendorPaymentsPage'))
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'))

function RouteFallback() {
  const { t } = useTranslation()
  return <VxAlert severity="info">{t('routeGuards.loadingWorkspace')}</VxAlert>
}

function AppRoutes() {
  const { t } = useTranslation()

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
            <Route element={<AppLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.reports.view] }} />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.customers.view] }} />}>
                  <Route path="/customers" element={<CustomersPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.sales.view] }} />}>
                  <Route path="/sales-orders" element={<SalesOrdersPage />} />
                  <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
                  <Route path="/sales-shipments" element={<SalesShipmentsPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.sales.view] }} />}>
                  <Route path="/customer-payments" element={<CustomerPaymentsPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.billing.view] }} />}>
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/fiscal-periods" element={<FiscalPeriodsPage />} />
                  <Route path="/journals" element={<JournalsPage />} />
                  <Route path="/config/numbering" element={<ConfigNumberingPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.accounting.view, Permissions.organization.view] }} />}>
                  <Route path="/config/tax-discount" element={<ConfigTaxDiscountPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.accounting.view] }} />}>
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ anyOf: [Permissions.users.view, Permissions.roles.view, Permissions.organization.view, Permissions.accounting.view, Permissions.billing.view, Permissions.products.view, Permissions.imports.validate, Permissions.imports.history] }} />}>
                  <Route path="/config" element={<ConfigPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.users.view] }} />}>
                  <Route path="/config/users" element={<ConfigUsersPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.roles.view] }} />}>
                  <Route path="/config/roles" element={<ConfigRolesPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.organization.view] }} />}>
                  <Route path="/config/menu" element={<ConfigMenuPage />} />
                  <Route path="/config/company" element={<ConfigCompanyPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ anyOf: [Permissions.imports.validate, Permissions.imports.history] }} />}>
                  <Route path="/config/import-data" element={<ConfigImportDataPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.products.view] }} />}>
                  <Route path="/config/product-categories" element={<ConfigProductCategoriesPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                </Route>
                <Route element={<ModuleRouteGuard module="project" />}>
                  <Route element={<PermissionRoute requirement={{ allOf: [Permissions.projects.view] }} />}>
                    <Route path="/project-categories" element={<ProjectCategoriesPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                  </Route>
                  <Route element={<PermissionRoute requirement={{ allOf: [Permissions.projectDocuments.view] }} />}>
                    <Route path="/project-documents" element={<ProjectDocumentsPage />} />
                  </Route>
                  <Route element={<PermissionRoute requirement={{ allOf: [Permissions.tenants.view] }} />}>
                    <Route path="/tenant-relationships" element={<TenantRelationshipsPage />} />
                  </Route>
                </Route>
                <Route element={<ModuleRouteGuard module="employee" />}>
                  <Route element={<PermissionRoute requirement={{ allOf: [Permissions.organization.view] }} />}>
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/consultants" element={<ConsultantsPage />} />
                  </Route>
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.inventory.view] }} />}>
                  <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
                  <Route path="/inventory-reports" element={<InventoryReportsPage />} />
                  <Route path="/stock-counts" element={<StockCountsPage />} />
                  <Route path="/stock-transfers" element={<StockTransfersPage />} />
                  <Route path="/warehouses" element={<WarehousesPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.purchasing.view] }} />}>
                  <Route path="/purchase-invoices" element={<PurchaseInvoicesPage />} />
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/purchase-receipts" element={<PurchaseReceiptsPage />} />
                  <Route path="/vendor-payments" element={<VendorPaymentsPage />} />
                </Route>
                <Route element={<PermissionRoute requirement={{ allOf: [Permissions.suppliers.view] }} />}>
                  <Route path="/suppliers" element={<SuppliersPage />} />
                </Route>
              </Route>
            </Route>

            <Route element={<PublicAuthLayout />}>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/login/*" element={<NotFoundPage variant="public" backTo="/login" backLabel={t('pages.notFound.backToSignIn')} />} />
              <Route path="/tenants/*" element={<NotFoundPage variant="public" backTo="/tenants" backLabel={t('pages.notFound.backToOnboarding')} />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route path="*" element={<NotFoundPage variant="admin" />} />
            </Route>
      </Routes>
    </Suspense>
  )
}

function AppShell() {
  return (
    <AuthProvider>
      <TenantModuleProvider>
        <CurrencyProvider>
          <UnsavedChangesNavigationGuard>
            <AppRoutes />
          </UnsavedChangesNavigationGuard>
        </CurrencyProvider>
      </TenantModuleProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([{ path: '*', element: <AppShell /> }])

function App() {
  return <RouterProvider router={router} />
}

export default App
