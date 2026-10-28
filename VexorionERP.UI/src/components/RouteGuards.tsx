import { VxAlert } from '@vexorion/ui/bootstrap'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useTenantModules } from '../app/TenantModuleContext'
import { hasRequiredPermissions, type PermissionRequirement } from '../app/authorization'

export function ProtectedRoute() {
  const { t } = useTranslation()
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.checkingSession')}</VxAlert>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
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

type ModuleRouteGuardProps = {
  module: 'project' | 'employee' | 'document'
}

export function ModuleRouteGuard({ module }: ModuleRouteGuardProps) {
  const { t } = useTranslation()
  const { isLoading, projectManagementEnabled, employeeManagementEnabled, documentManagementEnabled } = useTenantModules()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.loadingWorkspace')}</VxAlert>
  }

  const enabled =
    module === 'project'
      ? projectManagementEnabled
      : module === 'employee'
        ? employeeManagementEnabled
        : documentManagementEnabled

  if (!enabled) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function PermissionRoute({ requirement }: { requirement: PermissionRequirement }) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <VxAlert severity="info">{t('routeGuards.checkingSession')}</VxAlert>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasRequiredPermissions(user?.permissions, requirement)) {
    return (
      <VxAlert severity="warning">
        {t('routeGuards.permissionDenied')}
      </VxAlert>
    )
  }

  return <Outlet />
}
