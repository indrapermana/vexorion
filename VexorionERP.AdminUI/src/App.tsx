import './App.css'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Alert, CssBaseline, ThemeProvider } from '@vexorion/ui'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { ThemeModeProvider } from './app/ThemeModeContext'
import { createAppTheme } from './theme'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import type { ThemeMode } from './theme'

const THEME_MODE_STORAGE_KEY = 'vexorion.admin.themeMode'

const AppLayout = lazy(() => import('./components/AppLayout'))
const PublicAuthLayout = lazy(() => import('./components/PublicAuthLayout'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TenantManagementPage = lazy(() => import('./pages/TenantManagementPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const MenuConfigurationPage = lazy(() => import('./pages/MenuConfigurationPage'))

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'dark' ? 'dark' : 'light'
}

function RouteFallback() {
  return <Alert severity="info">Loading...</Alert>
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY)))

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
    document.documentElement.setAttribute('data-theme-mode', themeMode)
  }, [themeMode])

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
            <CssBaseline />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/tenants" element={<TenantManagementPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/menu-configuration" element={<MenuConfigurationPage />} />
                  </Route>
                </Route>

                <Route element={<PublicAuthLayout />}>
                  <Route element={<PublicOnlyRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                  </Route>
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
