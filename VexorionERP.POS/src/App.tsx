import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './app/AuthContext'
import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
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
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<PosPage />} />
          </Route>

          <Route element={<PermissionRoute permission="roles.manage" />}>
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
