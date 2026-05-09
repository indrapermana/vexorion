import './App.css'
import { Suspense, lazy } from 'react'
import { Alert } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { CurrencyProvider } from './app/CurrencyContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'

const AppLayout = lazy(() => import('./components/AppLayout'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'))
const ConfigCompanyPage = lazy(() => import('./pages/ConfigCompanyPage'))
const ConfigImportDataPage = lazy(() => import('./pages/ConfigImportDataPage'))
const ConfigProductCategoriesPage = lazy(() => import('./pages/ConfigProductCategoriesPage'))
const ConfigMenuPage = lazy(() => import('./pages/ConfigMenuPage'))
const ConfigPage = lazy(() => import('./pages/ConfigPage'))
const ConfigRolesPage = lazy(() => import('./pages/ConfigRolesPage'))
const ConfigTaxDiscountPage = lazy(() => import('./pages/ConfigTaxDiscountPage'))
const ConfigUsersPage = lazy(() => import('./pages/ConfigUsersPage'))
const PublicAuthLayout = lazy(() => import('./components/PublicAuthLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CustomerPaymentsPage = lazy(() => import('./pages/CustomerPaymentsPage'))
const FiscalPeriodsPage = lazy(() => import('./pages/FiscalPeriodsPage'))
const JournalsPage = lazy(() => import('./pages/JournalsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const InventoryAdjustmentsPage = lazy(() => import('./pages/InventoryAdjustmentsPage'))
const PurchaseInvoicesPage = lazy(() => import('./pages/PurchaseInvoicesPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const PurchaseReceiptsPage = lazy(() => import('./pages/PurchaseReceiptsPage'))
const SalesShipmentsPage = lazy(() => import('./pages/SalesShipmentsPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SalesInvoicesPage = lazy(() => import('./pages/SalesInvoicesPage'))
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'))
const StockCountsPage = lazy(() => import('./pages/StockCountsPage'))
const StockTransfersPage = lazy(() => import('./pages/StockTransfersPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const TenantsPage = lazy(() => import('./pages/TenantsPage'))
const VendorPaymentsPage = lazy(() => import('./pages/VendorPaymentsPage'))
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'))

function RouteFallback() {
  return <Alert severity="info">Loading workspace...</Alert>
}

function App() {
  const { t } = useTranslation()

  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customer-payments" element={<CustomerPaymentsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="/config/users" element={<ConfigUsersPage />} />
                <Route path="/config/roles" element={<ConfigRolesPage />} />
                <Route path="/config/menu" element={<ConfigMenuPage />} />
                <Route path="/config/tax-discount" element={<ConfigTaxDiscountPage />} />
                <Route path="/config/company" element={<ConfigCompanyPage />} />
                <Route path="/config/import-data" element={<ConfigImportDataPage />} />
                <Route path="/config/product-categories" element={<ConfigProductCategoriesPage />} />
                <Route path="/fiscal-periods" element={<FiscalPeriodsPage />} />
                <Route path="/journals" element={<JournalsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
                <Route path="/purchase-invoices" element={<PurchaseInvoicesPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/purchase-receipts" element={<PurchaseReceiptsPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
                <Route path="/sales-shipments" element={<SalesShipmentsPage />} />
                <Route path="/stock-counts" element={<StockCountsPage />} />
                <Route path="/stock-transfers" element={<StockTransfersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/vendor-payments" element={<VendorPaymentsPage />} />
                <Route path="/warehouses" element={<WarehousesPage />} />
              </Route>
            </Route>

            <Route element={<PublicAuthLayout />}>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/login/*" element={<NotFoundPage variant="public" backTo="/login" backLabel={t('pages.notFound.backToSignIn')} />} />
              <Route path="/tenants/*" element={<NotFoundPage variant="public" backTo="/tenants" backLabel={t('pages.notFound.backToOnboarding')} />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route path="*" element={<NotFoundPage variant="admin" />} />
            </Route>
          </Routes>
        </Suspense>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
