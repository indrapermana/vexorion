import { VxAlert } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { hasAdminPermissions, type AdminPermissionRequirement } from '../app/authorization'

export function ProtectedRoute() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.checkingSession')}</VxAlert>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.loadingWorkspace')}</VxAlert>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function PermissionRoute({ requirement }: { requirement: AdminPermissionRequirement }) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.checkingSession')}</VxAlert>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasAdminPermissions(user?.permissions, requirement)) {
    return (
      <VxAlert severity="warning">
        {t('routeGuards.permissionDenied', { defaultValue: 'You do not have permission to open this workspace.' })}
      </VxAlert>
    )
  }

  return <Outlet />
}
