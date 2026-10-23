import { VxAlert, VxBox, VxButton, VxChip, VxMenuItem, VxPageFeedback, VxPageHeader, VxPaper, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTenantMenuConfiguration, getTenants, updateTenantMenuConfiguration } from '../lib/api'
import type { TenantListItemResponse } from '../types/api'
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
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const data = await getTenants()
        setTenants(data)
        if (data.length > 0) {
          setSelectedTenantId(data[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('pages.menuConfiguration.errors.tenants'))
        console.error(err)
      }
    }

    void loadTenants()
  }, [t])

  useEffect(() => {
    if (!selectedTenantId) {
      setHiddenMenus([])
      return
    }

    const loadConfiguration = async () => {
      try {
        setError(null)
        const response = await getTenantMenuConfiguration(selectedTenantId)
        setHiddenMenus(response.hiddenMenuLinks as MenuItemKey[])
      } catch (err) {
        setError(err instanceof Error ? err.message : t('pages.menuConfiguration.errors.load'))
        console.error(err)
        setHiddenMenus([])
      }
    }

    void loadConfiguration()
  }, [selectedTenantId, t])

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId],
  )

  const toggleMenu = (menuKey: MenuItemKey, enabled: boolean) => {
    setHiddenMenus((current) => {
      if (!enabled) {
        if (current.includes(menuKey)) return current
        return [...current, menuKey]
      }

      return current.filter((item) => item !== menuKey)
    })
  }

  const handleSave = async () => {
    if (!selectedTenantId) return

    try {
      setIsSaving(true)
      setError(null)
      const updated = await updateTenantMenuConfiguration(selectedTenantId, hiddenMenus)
      setHiddenMenus(updated.hiddenMenuLinks as MenuItemKey[])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pages.menuConfiguration.errors.save'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader title={t('pages.menuConfiguration.title')} description={t('pages.menuConfiguration.description')} />

      <VxPageFeedback error={error} />
      {!canManage ? <VxAlert severity="info">{t('pages.menuConfiguration.viewOnly')}</VxAlert> : null}

      <VxPaper className="panel-card" elevation={0}>
        <VxStack spacing={2}>
          <VxTextField
            select
            label={t('pages.menuConfiguration.tenant')}
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
            fullWidth
          >
            {tenants.map((tenant) => (
              <VxMenuItem key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.code})
              </VxMenuItem>
            ))}
          </VxTextField>

          {selectedTenant ? (
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <VxChip label={selectedTenant.isActive ? t('pages.menuConfiguration.activeTenant') : t('pages.menuConfiguration.inactiveTenant')} color={selectedTenant.isActive ? 'success' : 'default'} size="small" />
              <VxChip label={selectedTenant.domain ? t('pages.menuConfiguration.domain', { domain: selectedTenant.domain }) : t('pages.menuConfiguration.noDomain')} size="small" />
            </VxStack>
          ) : null}

          <VxStack spacing={1}>
            {tenantMenuItems.map((menuItem) => {
              const isEnabled = !hiddenMenus.includes(menuItem.key)

              return (
                <VxStack
                  key={menuItem.key}
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, p: 1.25, border: '1px solid rgba(108, 92, 231, 0.08)', borderRadius: 2 }}
                >
                  <VxBox sx={{ minWidth: 0 }}>
                    <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{t(`menuItems.${menuItem.labelKey}`)}</VxTypography>
                    <VxTypography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{t('pages.menuConfiguration.menuKey')} {menuItem.key}</VxTypography>
                  </VxBox>
                  <VxSwitch
                    checked={isEnabled}
                    slotProps={{ input: { 'aria-label': t(`menuItems.${menuItem.labelKey}`) } }}
                    disabled={!canManage}
                    onChange={(_, checked) => toggleMenu(menuItem.key, checked)}
                  />
                </VxStack>
              )
            })}
          </VxStack>

          <VxStack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <VxButton variant="contained" onClick={() => void handleSave()} disabled={!canManage || isSaving || !selectedTenantId}>
              {isSaving ? t('common.saving') : t('common.save')}
            </VxButton>
          </VxStack>
        </VxStack>
      </VxPaper>
    </VxStack>
  )
}
