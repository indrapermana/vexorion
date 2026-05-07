import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { lazy, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteTenant, getTenants } from '../../../lib/api'
import type { TenantListItemResponse } from '../../../types/api'
import { TenantDataGrid } from '../components/TenantDataGrid'
import { TenantOnboardingDialog } from '../components/TenantOnboardingDialog'

const TenantEditorDialog = lazy(() => import('../components/TenantEditorDialog').then((m) => ({ default: m.TenantEditorDialog })))

export default function TenantManagementPage() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<TenantListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<TenantListItemResponse | null>(null)

  const loadTenants = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTenants()
      setTenants(data)
    } catch (err) {
      setError('Failed to load tenants')
      console.error('Error loading tenants:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      setError('Failed to remove tenant.')
      console.error(err)
    }
  }

  const handleTenantCreated = (newTenant: TenantListItemResponse) => {
    setTenants((prev) => [newTenant, ...prev])
  }

  const activeTenants = tenants.filter((t) => t.isActive).length

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {t('pages.tenantManagement.loadingTools')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('pages.tenantManagement.description')}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setIsOnboardingOpen(true)}>
            New Tenant
          </Button>
        </Box>

        <Stack direction="row" spacing={2}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {t('pages.tenantManagement.metrics.rows')}
            </Typography>
            <Typography variant="h5">{tenants.length}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {t('pages.tenantManagement.metrics.active')}
            </Typography>
            <Typography variant="h5">{activeTenants}</Typography>
          </Paper>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TenantDataGrid rows={tenants} isLoading={isLoading} onEdit={handleEdit} onRemove={handleTenantRemove} />

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
      </Stack>
    </Box>
  )
}
