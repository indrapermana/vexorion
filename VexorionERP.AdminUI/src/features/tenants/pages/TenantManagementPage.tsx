import { VxBox, VxButton, VxChip, VxPageBody, VxPageFeedback, VxPageHeader, VxStack, VxSwitch, VxTypography } from '@vexorion/ui'
import { lazy, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VxCard } from '@vexorion/ui'
import { deleteTenant, getTenantModuleEffectiveAccess, getTenants } from '../../../lib/api'
import type { TenantListItemResponse, TenantModuleEffectiveAccessResponse } from '../../../types/api'
import { TenantDataGrid } from '../components/TenantDataGrid'
import { TenantOnboardingDialog } from '../components/TenantOnboardingDialog'
import { useAuth } from '../../../app/AuthContext'
import { AdminPermissions, hasAdminPermissions } from '../../../app/authorization'

const TenantEditorDialog = lazy(() => import('../components/TenantEditorDialog').then((m) => ({ default: m.TenantEditorDialog })))

export default function TenantManagementPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canManage = hasAdminPermissions(user?.permissions, { allOf: [AdminPermissions.tenants.manage] })
  const [tenants, setTenants] = useState<TenantListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<TenantListItemResponse | null>(null)
  const [effectiveAccessByTenantId, setEffectiveAccessByTenantId] = useState<Record<string, TenantModuleEffectiveAccessResponse>>({})
  const [showDisabledModulesOnly, setShowDisabledModulesOnly] = useState(false)

  const hasDisabledModules = useCallback((tenantId: string) => {
    const access = effectiveAccessByTenantId[tenantId]
    if (!access) {
      return false
    }

    return !access.project.effectiveEnabled || !access.document.effectiveEnabled || !access.employee.effectiveEnabled
  }, [effectiveAccessByTenantId])

  const loadTenants = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTenants()
      setTenants(data)

      const accessEntries = await Promise.all(
        data.map(async (tenant) => {
          try {
            const access = await getTenantModuleEffectiveAccess(tenant.id)
            return [tenant.id, access] as const
          } catch (accessError) {
            console.error(`Error loading module access for tenant ${tenant.id}:`, accessError)
            return null
          }
        }),
      )

      setEffectiveAccessByTenantId(
        accessEntries.reduce<Record<string, TenantModuleEffectiveAccessResponse>>((acc, entry) => {
          if (entry) {
            acc[entry[0]] = entry[1]
          }
          return acc
        }, {}),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pages.tenantManagement.errors.load'))
      console.error('Error loading tenants:', err)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTenants()
  }, [loadTenants])

  const handleEdit = (tenant: TenantListItemResponse) => {
    setSelectedTenant(tenant)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedTenant(null)
  }

  const handleTenantSaved = (updated: TenantListItemResponse) => {
    setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    handleEditorClose()
  }

  const handleTenantRemove = async (tenant: TenantListItemResponse) => {
    try {
      await deleteTenant(tenant.id)
      setTenants((prev) => prev.filter((item) => item.id !== tenant.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pages.tenantManagement.errors.remove'))
      console.error(err)
    }
  }

  const handleTenantCreated = (newTenant: TenantListItemResponse) => {
    setTenants((prev) => [newTenant, ...prev])
  }

  const activeTenants = tenants.filter((t) => t.isActive).length
  const tenantsWithDisabledModules = tenants.filter((tenant) => hasDisabledModules(tenant.id)).length
  const visibleTenants = showDisabledModulesOnly
    ? tenants.filter((tenant) => hasDisabledModules(tenant.id))
    : tenants

  return (
    <VxBox sx={{ p: 3 }}>
      <VxStack spacing={3}>
        <VxPageHeader
          title={t('pages.tenantManagement.loadingTools')}
          description={t('pages.tenantManagement.description')}
          action={canManage ? (
            <VxButton variant="contained" onClick={() => setIsOnboardingOpen(true)}>
              {t('pages.tenantManagement.newTenant')}
            </VxButton>
          ) : undefined}
        />

        <VxStack direction="row" spacing={2}>
          <VxCard title={t('pages.tenantManagement.metrics.rows')} className="panel-card" style={{ flex: 1 }}>
            <VxTypography variant="h5">{tenants.length}</VxTypography>
          </VxCard>
          <VxCard title={t('pages.tenantManagement.metrics.active')} className="panel-card" style={{ flex: 1 }}>
            <VxTypography variant="h5">{activeTenants}</VxTypography>
          </VxCard>
          <VxCard title={t('pages.tenantManagement.modulesDisabled')} className="panel-card" style={{ flex: 1 }}>
            <VxTypography variant="h5">{tenantsWithDisabledModules}</VxTypography>
          </VxCard>
        </VxStack>

        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}>
          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <VxTypography variant="body2" color="textSecondary">{t('pages.tenantManagement.disabledOnly')}</VxTypography>
            <VxSwitch checked={showDisabledModulesOnly} onChange={(event) => setShowDisabledModulesOnly(event.target.checked)} />
          </VxStack>

          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <VxTypography variant="caption" color="textSecondary">{t('pages.tenantManagement.legend')}</VxTypography>
            <VxChip size="small" color="success" label={t('pages.tenantManagement.enabled')} />
            <VxChip size="small" variant="outlined" label={t('pages.tenantManagement.disabled')} />
            <VxTypography variant="caption" color="textSecondary">{t('pages.tenantManagement.moduleLegend')}</VxTypography>
          </VxStack>
        </VxStack>

        <VxPageFeedback
          error={error}
          info={!canManage ? t('pages.tenantManagement.viewOnly') : undefined}
          onRetry={() => void loadTenants()}
        />

        <VxPageBody>
          <TenantDataGrid
            rows={visibleTenants}
            isLoading={isLoading}
            onEdit={handleEdit}
            onRemove={handleTenantRemove}
            effectiveAccessByTenantId={effectiveAccessByTenantId}
            canManage={canManage}
          />
        </VxPageBody>

        {canManage ? (
          <>
            <TenantEditorDialog
              open={isEditorOpen}
              tenant={selectedTenant}
              onClose={handleEditorClose}
              onSaved={handleTenantSaved}
            />

            <TenantOnboardingDialog
              open={isOnboardingOpen}
              onClose={() => setIsOnboardingOpen(false)}
              onCreated={handleTenantCreated}
            />
          </>
        ) : null}
      </VxStack>
    </VxBox>
  )
}
