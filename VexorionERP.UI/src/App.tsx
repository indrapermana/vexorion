import './App.css'
import { Suspense, lazy } from 'react'
import { Alert } from '@mui/material'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'

const AppLayout = lazy(() => import('./components/AppLayout'))
const PublicAuthLayout = lazy(() => import('./components/PublicAuthLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const InventoryAdjustmentsPage = lazy(() => import('./pages/InventoryAdjustmentsPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'))
const StockTransfersPage = lazy(() => import('./pages/StockTransfersPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const TenantsPage = lazy(() => import('./pages/TenantsPage'))
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'))

function RouteFallback() {
  return <Alert severity="info">Loading workspace...</Alert>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/stock-transfers" element={<StockTransfersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/warehouses" element={<WarehousesPage />} />
              </Route>
            </Route>

            <Route element={<PublicAuthLayout />}>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/login/*" element={<NotFoundPage variant="public" backTo="/login" backLabel="Back to sign in" />} />
              <Route path="/tenants/*" element={<NotFoundPage variant="public" backTo="/tenants" backLabel="Back to onboarding" />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route path="*" element={<NotFoundPage variant="admin" />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
