import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './app/AuthContext'
import { PermissionRoute, PermissionsRoute, PublicOnlyRoute } from './components/RouteGuards'
import { PosPermissions, posWorkspacePermissions } from './app/authorization'
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning'
import LoginPage from './pages/LoginPage'
import PosAdminPage from './pages/PosAdminPage'
import PosPage from './pages/PosPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionTimeoutWarning />
        <Routes>
          <Route element={<PermissionsRoute permissions={posWorkspacePermissions} />}>
            <Route path="/" element={<PosPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PosPermissions.roles.manage} />}>
            <Route path="/admin" element={<PosAdminPage />} />
          </Route>

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
