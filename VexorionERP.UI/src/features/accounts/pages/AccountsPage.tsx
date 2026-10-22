import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { ApiError, deleteAccount, getAccounts } from '../../../lib/api'
import type { AccountDetailsResponse, AccountListItemResponse } from '../../../types/api'

const AccountDataGrid = lazy(() => import('../components/AccountDataGrid'))
const AccountEditorDialog = lazy(() => import('../components/AccountEditorDialog'))

function AccountSurfaceFallback() {
  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <VxCircularProgress size={28} />
    </VxBox>
  )
}

export default function AccountsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.billing.manage) ?? false
  const [rows, setRows] = useState<AccountListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setRows(await getAccounts())
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openCreate = () => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    setSelectedId(null)
    setIsEditorOpen(true)
  }

  const openEdit = (accountId: string) => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('edit')
    setSelectedId(accountId)
    setIsEditorOpen(true)
  }

  const handleDelete = async (row: AccountListItemResponse) => {
    if (!canManage) return
    if (!window.confirm(`Delete account ${row.code}?`)) {
      return
    }

    setFeedback(null)
    setError(null)
    try {
      await deleteAccount(row.id)
      setFeedback(`Account ${row.code} deleted.`)
      await loadData()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) setError(deleteError.message)
      else setError('Unable to delete account.')
    }
  }

  const handleSaved = async (account: AccountDetailsResponse, mode: 'create' | 'edit') => {
    setFeedback(mode === 'create' ? `Account ${account.code} created.` : `Account ${account.code} updated.`)
    setIsEditorOpen(false)
    setSelectedId(null)
    await loadData()
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.accounts.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.accounts')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.accounts.description')}</VxTypography>
          </VxBox>
          {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>{t('pages.accounts.newButton')}</VxButton> : null}
        </VxStack>
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.billing.manage} /> : null}

      <VxPaper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<AccountSurfaceFallback />}>
          <AccountDataGrid rows={rows} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} canManage={canManage} />
        </Suspense>
      </VxPaper>

      {canManage && isEditorOpen ? (
        <Suspense fallback={<AccountSurfaceFallback />}>
          <AccountEditorDialog open={isEditorOpen} mode={editorMode} accountId={selectedId} onClose={() => setIsEditorOpen(false)} onSaved={(account, mode) => void handleSaved(account, mode)} />
        </Suspense>
      ) : null}
    </VxStack>
  )
}
