import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, Groups2RoundedIcon, MailOutlineRoundedIcon, MonetizationOnRoundedIcon } from '@vexorion/ui'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteCustomer, getCustomers } from '../../../lib/api'
import type { CustomerDetailsResponse, CustomerListItemResponse } from '../../../types/api'
import type { CustomerDialogMode } from '../../../types/ui'

const CustomerEditorDialog = lazy(() => import('../components/CustomerEditorDialog'))
const CustomerDataGrid = lazy(() => import('../components/CustomerDataGrid'))
const CustomerDeleteDialog = lazy(() => import('../components/CustomerDeleteDialog'))

function CustomerSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{t('pages.customers.loadingTools')}</Typography>
      </Stack>
    </Box>
  )
}

export default function CustomersPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [customers, setCustomers] = useState<CustomerListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<CustomerDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated) {
      setCustomers([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getCustomers()
      setCustomers(result)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load customers.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedCustomerId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (customerId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedCustomerId(customerId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedCustomerId(null)
  }

  const handleSaved = async (customer: CustomerDetailsResponse, mode: CustomerDialogMode) => {
    setFeedback(mode === 'create' ? `Customer ${customer.name} created.` : `Customer ${customer.name} updated.`)
    handleEditorClose()
    await loadCustomers()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteCustomer(deleteTarget.id)
      setFeedback(`Customer ${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
      await loadCustomers()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete customer.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Alert severity="info">{t('pages.customers.signInRequired')}</Alert>
    )
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.customers')}</Typography>
            <Typography color="text.secondary">
              {t('pages.customers.description')}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              {t('pages.customers.newButton')}
            </Button>
            <Paper elevation={0} className="products-metric-card">
              <Groups2RoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.customers.metrics.rows')}</Typography>
                <Typography variant="h6">{customers.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <MailOutlineRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.common.withEmail')}</Typography>
                <Typography variant="h6">{customers.filter((customer) => Boolean(customer.email)).length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <MonetizationOnRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">{t('pages.customers.metrics.active')}</Typography>
                <Typography variant="h6">{customers.filter((customer) => customer.isActive).length}</Typography>
              </Box>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<CustomerSurfaceFallback />}>
          <CustomerDataGrid
            rows={customers}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
          />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<CustomerSurfaceFallback />}>
          <CustomerEditorDialog
            key={`${dialogMode}:${selectedCustomerId ?? 'new'}`}
            open={isEditorOpen}
            mode={dialogMode}
            customerId={selectedCustomerId}
            onClose={handleEditorClose}
            onSaved={(customer, mode) => void handleSaved(customer, mode)}
          />
        </Suspense>
      ) : null}

      {deleteTarget ? (
        <Suspense fallback={null}>
          <CustomerDeleteDialog
            target={deleteTarget}
            isDeleting={isDeleting}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => void handleDelete()}
          />
        </Suspense>
      ) : null}
    </Stack>
  )
}