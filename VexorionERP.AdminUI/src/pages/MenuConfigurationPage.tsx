import { VxAlert, VxButton, VxChip, VxMenuItem, VxPageBody, VxPageEmpty, VxPageFeedback, VxPageHeader, VxPageLoading, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, getTenantMenuConfiguration, getTenantModuleEffectiveAccess, getTenants, reportClientDiagnostic, updateTenantMenuConfiguration } from '../lib/api'
import type { TenantListItemResponse, TenantModuleEffectiveAccessItemResponse, TenantModuleEffectiveAccessResponse } from '../types/api'
import { useAuth } from '../app/AuthContext'
import { AdminPermissions, hasAdminPermissions } from '../app/authorization'

const tenantMenuItems = [
  { key: '/', labelKey: 'dashboard' },
  { key: '/customers', labelKey: 'customers' },
  { key: '/sales-orders', labelKey: 'salesOrders' },
  { key: '/sales-shipments', labelKey: 'salesShipments' },
  { key: '/sales-invoices', labelKey: 'salesInvoices' },
  { key: '/customer-payments', labelKey: 'customerPayments' },
  { key: '/suppliers', labelKey: 'suppliers' },
  { key: '/purchase-orders', labelKey: 'purchaseOrders' },
  { key: '/purchase-receipts', labelKey: 'purchaseReceipts' },
  { key: '/purchase-invoices', labelKey: 'purchaseInvoices' },
  { key: '/vendor-payments', labelKey: 'vendorPayments' },
  { key: '/products', labelKey: 'products' },
  { key: '/inventory-adjustments', labelKey: 'inventoryAdjustments' },
  { key: '/stock-counts', labelKey: 'stockCounts' },
  { key: '/stock-transfers', labelKey: 'stockTransfers' },
  { key: '/warehouses', labelKey: 'warehouses' },
  { key: '/accounts', labelKey: 'accounts' },
  { key: '/audit-logs', labelKey: 'auditLogs' },
  { key: '/fiscal-periods', labelKey: 'fiscalPeriods' },
  { key: '/journals', labelKey: 'journals' },
  { key: '/reports', labelKey: 'reports' },
  { key: '/project-categories', labelKey: 'projectCategories', module: 'project' },
  { key: '/project-documents', labelKey: 'projectDocuments', module: 'document' },
  { key: '/projects', labelKey: 'projects', module: 'project' },
  { key: '/employees', labelKey: 'employees', module: 'employee' },
  { key: '/consultants', labelKey: 'consultants', module: 'employee' },
  { key: '/tenant-relationships', labelKey: 'tenantRelationships', module: 'project' },
  { key: '/config', labelKey: 'configuration' },
] as const

type MenuItemKey = (typeof tenantMenuItems)[number]['key']

export default function MenuConfigurationPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canManage = hasAdminPermissions(user?.permissions, { allOf: [AdminPermissions.tenants.manage] })
  const [tenants, setTenants] = useState<TenantListItemResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [hiddenMenus, setHiddenMenus] = useState<MenuItemKey[]>([])
  const [moduleAccess, setModuleAccess] = useState<TenantModuleEffectiveAccessResponse | null>(null)
  const [moduleAccessUnavailable, setModuleAccessUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [isLoadingConfiguration, setIsLoadingConfiguration] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadTenants = useCallback(async () => {
    setIsLoadingTenants(true)
    setError(null)
    try {
      const data = await getTenants()
      setTenants(data)
      setSelectedTenantId((current) => current && data.some((tenant) => tenant.id === current) ? current : (data[0]?.id ?? ''))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.menuConfiguration.errors.tenants'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsLoadingTenants(false)
    }
  }, [t])

  useEffect(() => {
    void loadTenants()
  }, [loadTenants])

  const loadConfiguration = useCallback(async () => {
    if (!selectedTenantId) {
      setHiddenMenus([])
      setModuleAccess(null)
      setModuleAccessUnavailable(false)
      return
    }

    setIsLoadingConfiguration(true)
    setError(null)
    try {
      const [configurationResult, moduleAccessResult] = await Promise.allSettled([
        getTenantMenuConfiguration(selectedTenantId),
        getTenantModuleEffectiveAccess(selectedTenantId),
      ])

      if (configurationResult.status === 'rejected') throw configurationResult.reason
      setHiddenMenus(configurationResult.value.hiddenMenuLinks as MenuItemKey[])
      setModuleAccess(moduleAccessResult.status === 'fulfilled' ? moduleAccessResult.value : null)
      setModuleAccessUnavailable(moduleAccessResult.status === 'rejected')
      if (moduleAccessResult.status === 'rejected' && !(moduleAccessResult.reason instanceof ApiError)) {
        reportClientDiagnostic('operation.failed', moduleAccessResult.reason)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.menuConfiguration.errors.load'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
      setHiddenMenus([])
      setModuleAccess(null)
      setModuleAccessUnavailable(false)
    } finally {
      setIsLoadingConfiguration(false)
    }
  }, [selectedTenantId, t])

  useEffect(() => {
    void loadConfiguration()
  }, [loadConfiguration])

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId],
  )

  const toggleMenu = (menuKey: MenuItemKey, enabled: boolean) => {
    setSuccess(null)
    setHiddenMenus((current) => {
      if (!enabled) {
        if (current.includes(menuKey)) return current
        return [...current, menuKey]
      }

      return current.filter((item) => item !== menuKey)
    })
  }

  const getModuleItem = (module: 'project' | 'document' | 'employee' | undefined): TenantModuleEffectiveAccessItemResponse | null => {
    if (!module || !moduleAccess) return null
    return moduleAccess[module]
  }

  const handleSave = async () => {
    if (!selectedTenantId) return

    try {
      setIsSaving(true)
      setError(null)
      const updated = await updateTenantMenuConfiguration(selectedTenantId, hiddenMenus)
      setHiddenMenus(updated.hiddenMenuLinks as MenuItemKey[])
      setSuccess(t('pages.menuConfiguration.saved'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.menuConfiguration.errors.save'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader
        title={t('pages.menuConfiguration.title')}
        description={t('pages.menuConfiguration.description')}
        action={canManage && selectedTenantId ? (
          <VxButton variant="contained" onClick={() => void handleSave()} disabled={isSaving || isLoadingConfiguration}>
            {isSaving ? t('common.saving') : t('common.save')}
          </VxButton>
        ) : undefined}
        filters={tenants.length > 0 ? (
          <VxTextField
            select
            size="small"
            label={t('pages.menuConfiguration.tenant')}
            value={selectedTenantId}
            onChange={(event) => { setSuccess(null); setSelectedTenantId(event.target.value) }}
            sx={{ minWidth: 280 }}
          >
            {tenants.map((tenant) => (
              <VxMenuItem key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</VxMenuItem>
            ))}
          </VxTextField>
        ) : undefined}
      />

      <VxPageFeedback error={error} success={success} onRetry={() => void (selectedTenantId ? loadConfiguration() : loadTenants())} retryLabel={t('common.retry')} />
      {!canManage ? <VxAlert severity="info">{t('pages.menuConfiguration.viewOnly')}</VxAlert> : null}

      <VxPageBody>
        {isLoadingTenants || isLoadingConfiguration ? (
          <VxPageLoading label={t('pages.menuConfiguration.loading')} />
        ) : tenants.length === 0 ? (
          <VxPageEmpty title={t('pages.menuConfiguration.emptyTitle')} description={t('pages.menuConfiguration.emptyDescription')} />
        ) : (
        <VxStack spacing={2}>
          {selectedTenant ? (
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <VxChip label={selectedTenant.isActive ? t('pages.menuConfiguration.activeTenant') : t('pages.menuConfiguration.inactiveTenant')} color={selectedTenant.isActive ? 'success' : 'default'} size="small" />
              <VxChip label={selectedTenant.domain ? t('pages.menuConfiguration.domain', { domain: selectedTenant.domain }) : t('pages.menuConfiguration.noDomain')} size="small" />
            </VxStack>
          ) : null}

          <VxAlert severity="info">{t('pages.menuConfiguration.accessPolicy')}</VxAlert>
          {moduleAccessUnavailable ? <VxAlert severity="warning">{t('pages.menuConfiguration.moduleUnavailable')}</VxAlert> : null}

          <VxTableContainer>
            <VxTable size="small" aria-label={t('pages.menuConfiguration.previewTitle')} sx={{ minWidth: 920 }}>
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.menuConfiguration.columns.workspace')}</VxTableCell>
                  <VxTableCell>{t('pages.menuConfiguration.columns.preference')}</VxTableCell>
                  <VxTableCell>{t('pages.menuConfiguration.columns.policy')}</VxTableCell>
                  <VxTableCell>{t('pages.menuConfiguration.columns.entitlement')}</VxTableCell>
                  <VxTableCell>{t('pages.menuConfiguration.columns.permission')}</VxTableCell>
                  <VxTableCell>{t('pages.menuConfiguration.columns.result')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
            {tenantMenuItems.map((menuItem) => {
              const isEnabled = !hiddenMenus.includes(menuItem.key)
              const module = 'module' in menuItem ? menuItem.module : undefined
              const moduleItem = getModuleItem(module)
              const result = !isEnabled
                ? 'hidden'
                : module && !moduleItem
                  ? 'unavailable'
                  : moduleItem && !moduleItem.allowedByRollout
                    ? 'policyBlocked'
                    : moduleItem && !moduleItem.toggleEnabled
                      ? 'notEntitled'
                      : 'eligible'

              return (
                <VxTableRow key={menuItem.key}>
                  <VxTableCell component="th" scope="row">
                    <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{t(`menuItems.${menuItem.labelKey}`)}</VxTypography>
                    <VxTypography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{t('pages.menuConfiguration.menuKey')} {menuItem.key}</VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    <VxSwitch
                      checked={isEnabled}
                      slotProps={{ input: { 'aria-label': t('pages.menuConfiguration.showItem', { name: t(`menuItems.${menuItem.labelKey}`) }) } }}
                      disabled={!canManage}
                      onChange={(_, checked) => toggleMenu(menuItem.key, checked)}
                    />
                  </VxTableCell>
                  <VxTableCell><VxChip size="small" variant="outlined" color={moduleItem && !moduleItem.allowedByRollout ? 'warning' : 'default'} label={t(module ? moduleItem ? moduleItem.allowedByRollout ? 'pages.menuConfiguration.states.allowed' : 'pages.menuConfiguration.states.blocked' : 'pages.menuConfiguration.states.unavailable' : 'pages.menuConfiguration.states.notRequired')} /></VxTableCell>
                  <VxTableCell><VxChip size="small" variant="outlined" color={moduleItem && !moduleItem.toggleEnabled ? 'warning' : 'default'} label={t(module ? moduleItem ? moduleItem.toggleEnabled ? 'pages.menuConfiguration.states.enabled' : 'pages.menuConfiguration.states.disabled' : 'pages.menuConfiguration.states.unavailable' : 'pages.menuConfiguration.states.notRequired')} /></VxTableCell>
                  <VxTableCell><VxChip size="small" variant="outlined" label={t('pages.menuConfiguration.states.perUser')} /></VxTableCell>
                  <VxTableCell><VxChip size="small" color={result === 'eligible' ? 'success' : result === 'unavailable' ? 'default' : 'warning'} label={t(`pages.menuConfiguration.results.${result}`)} /></VxTableCell>
                </VxTableRow>
              )
            })}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>

        </VxStack>
        )}
      </VxPageBody>
    </VxStack>
  )
}
