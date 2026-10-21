import { VxBox, VxCircularProgress } from '@vexorion/ui'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { hasAllPosPermissions } from '../app/authorization'

function RouteGuardLoading() {
  return (
    <VxBox sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <VxCircularProgress size={28} />
    </VxBox>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <RouteGuardLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <RouteGuardLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function PermissionRoute({ permission }: { permission: string }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <RouteGuardLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.permissions.includes(permission)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function PermissionsRoute({ permissions }: { permissions: readonly string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return <RouteGuardLoading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!hasAllPosPermissions(user?.permissions, permissions)) return <Navigate to="/login" replace />

  return <Outlet />
}
