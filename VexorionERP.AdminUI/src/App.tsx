import './App.css'
import { Suspense, lazy, useMemo, useState } from 'react'
import { Alert, ThemeProvider } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { ThemeModeProvider } from './app/ThemeModeContext'
import { createAppTheme } from './theme'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import AppLayout from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const TenantManagementPage = lazy(() => import('./pages/TenantManagementPage'))

function RouteFallback() {
  return <Alert severity="info">Loading...</Alert>
}

export default function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  const themeModeValue = useMemo(
    () => ({
      mode: themeMode as 'light' | 'dark',
      setMode: setThemeMode,
    }),
    [themeMode],
  )

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeModeProvider value={themeModeValue}>
          <ThemeProvider theme={theme}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<TenantManagementPage />} />
                    <Route path="/tenants" element={<TenantManagementPage />} />
                  </Route>
                </Route>

                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ThemeProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
