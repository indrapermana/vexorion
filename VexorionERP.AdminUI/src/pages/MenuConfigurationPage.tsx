import { VxAlert, VxBox, VxButton, VxChip, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useEffect, useMemo, useState } from 'react'
import { getTenantMenuConfiguration, getTenants, updateTenantMenuConfiguration } from '../lib/api'
import type { TenantListItemResponse } from '../types/api'

const tenantMenuItems = [
  { key: '/', label: 'Dashboard' },
  { key: '/customers', label: 'Customers' },
  { key: '/sales-orders', label: 'Sales Orders' },
  { key: '/sales-shipments', label: 'Sales Shipments' },
  { key: '/sales-invoices', label: 'Sales Invoices' },
  { key: '/customer-payments', label: 'Customer Payments' },
  { key: '/suppliers', label: 'Suppliers' },
  { key: '/purchase-orders', label: 'Purchase Orders' },
  { key: '/purchase-receipts', label: 'Purchase Receipts' },
  { key: '/purchase-invoices', label: 'Purchase Invoices' },
  { key: '/vendor-payments', label: 'Vendor Payments' },
  { key: '/products', label: 'Products' },
  { key: '/inventory-adjustments', label: 'Inventory Adjustments' },
  { key: '/stock-counts', label: 'Stock Counts' },
  { key: '/stock-transfers', label: 'Stock Transfers' },
  { key: '/warehouses', label: 'Warehouses' },
  { key: '/accounts', label: 'Accounts' },
  { key: '/audit-logs', label: 'Audit Logs' },
  { key: '/fiscal-periods', label: 'Fiscal Periods' },
  { key: '/journals', label: 'Journals' },
  { key: '/reports', label: 'Reports' },
  { key: '/config', label: 'Configuration Center' },
] as const

type MenuItemKey = (typeof tenantMenuItems)[number]['key']

export default function MenuConfigurationPage() {
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
        setError('Unable to load tenants for menu configuration.')
        console.error(err)
      }
    }

    void loadTenants()
  }, [])

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
        setError('Unable to load menu configuration for this tenant.')
        console.error(err)
        setHiddenMenus([])
      }
    }

    void loadConfiguration()
  }, [selectedTenantId])

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
      setError('Unable to save menu configuration.')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <VxStack spacing={2.5}>
      <VxPaper className="hero-panel" elevation={0}>
        <VxStack spacing={1}>
          <VxTypography variant="h5">Menu Configuration</VxTypography>
          <VxTypography color="text.secondary">
            Enable or disable tenant app menus per tenant. Configuration is persisted in backend tenant preferences.
          </VxTypography>
        </VxStack>
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}

      <VxPaper className="panel-card" elevation={0}>
        <VxStack spacing={2}>
          <VxTextField
            select
            label="Tenant"
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
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <VxChip label={selectedTenant.isActive ? 'Active tenant' : 'Inactive tenant'} color={selectedTenant.isActive ? 'success' : 'default'} size="small" />
              <VxChip label={selectedTenant.domain ? `Domain: ${selectedTenant.domain}` : 'No custom domain'} size="small" />
            </VxStack>
          ) : null}

          <VxStack spacing={1}>
            {tenantMenuItems.map((menuItem) => {
              const isEnabled = !hiddenMenus.includes(menuItem.key)

              return (
                <VxStack
                  key={menuItem.key}
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center', p: 1.25, border: '1px solid rgba(108, 92, 231, 0.08)', borderRadius: 2 }}
                >
                  <VxBox>
                    <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{menuItem.label}</VxTypography>
                    <VxTypography variant="caption" color="text.secondary">menu key: {menuItem.key}</VxTypography>
                  </VxBox>
                  <VxSwitch checked={isEnabled} onChange={(_, checked) => toggleMenu(menuItem.key, checked)} />
                </VxStack>
              )
            })}
          </VxStack>

          <VxStack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <VxButton variant="contained" onClick={() => void handleSave()} disabled={isSaving || !selectedTenantId}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </VxButton>
          </VxStack>
        </VxStack>
      </VxPaper>
    </VxStack>
  )
}
