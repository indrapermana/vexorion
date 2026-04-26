import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteAccount, getAccounts } from '../../../lib/api'
import type { AccountDetailsResponse, AccountListItemResponse } from '../../../types/api'

const AccountDataGrid = lazy(() => import('../components/AccountDataGrid'))
const AccountEditorDialog = lazy(() => import('../components/AccountEditorDialog'))

function AccountSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

export default function AccountsPage() {
  const { isAuthenticated } = useAuth()
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
    setFeedback(null)
    setEditorMode('create')
    setSelectedId(null)
    setIsEditorOpen(true)
  }

  const openEdit = (accountId: string) => {
    setFeedback(null)
    setEditorMode('edit')
    setSelectedId(accountId)
    setIsEditorOpen(true)
  }

  const handleDelete = async (row: AccountListItemResponse) => {
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
    return <Alert severity="info">Sign in first. Accounts require billing permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Accounts</Typography>
            <Typography color="text.secondary">General ledger accounts from /api/accounts.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>New account</Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<AccountSurfaceFallback />}>
          <AccountDataGrid rows={rows} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<AccountSurfaceFallback />}>
          <AccountEditorDialog open={isEditorOpen} mode={editorMode} accountId={selectedId} onClose={() => setIsEditorOpen(false)} onSaved={(account, mode) => void handleSaved(account, mode)} />
        </Suspense>
      ) : null}
    </Stack>
  )
}
