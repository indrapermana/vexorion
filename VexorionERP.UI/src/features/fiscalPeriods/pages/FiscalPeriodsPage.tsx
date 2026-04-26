import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, closeFiscalPeriod, getFiscalPeriods, reopenFiscalPeriod } from '../../../lib/api'
import type { FiscalPeriodDetailsResponse, FiscalPeriodListItemResponse } from '../../../types/api'

const FiscalPeriodDataGrid = lazy(() => import('../components/FiscalPeriodDataGrid'))
const FiscalPeriodEditorDialog = lazy(() => import('../components/FiscalPeriodEditorDialog'))

function FiscalPeriodSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

export default function FiscalPeriodsPage() {
  const { isAuthenticated } = useAuth()
  const [rows, setRows] = useState<FiscalPeriodListItemResponse[]>([])
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
      setRows(await getFiscalPeriods())
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load fiscal periods.')
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

  const openEdit = (fiscalPeriodId: string) => {
    setFeedback(null)
    setEditorMode('edit')
    setSelectedId(fiscalPeriodId)
    setIsEditorOpen(true)
  }

  const handleSaved = async (period: FiscalPeriodDetailsResponse, mode: 'create' | 'edit') => {
    setFeedback(mode === 'create' ? `Fiscal period ${period.periodCode} created.` : `Fiscal period ${period.periodCode} updated.`)
    setIsEditorOpen(false)
    setSelectedId(null)
    await loadData()
  }

  const handleClosePeriod = async (row: FiscalPeriodListItemResponse) => {
    setFeedback(null)
    setError(null)
    try {
      const period = await closeFiscalPeriod(row.id)
      setFeedback(`Fiscal period ${period.periodCode} closed.`)
      await loadData()
    } catch (closeError) {
      if (closeError instanceof ApiError) setError(closeError.message)
      else setError('Unable to close fiscal period.')
    }
  }

  const handleReopenPeriod = async (row: FiscalPeriodListItemResponse) => {
    setFeedback(null)
    setError(null)
    try {
      const period = await reopenFiscalPeriod(row.id)
      setFeedback(`Fiscal period ${period.periodCode} reopened.`)
      await loadData()
    } catch (reopenError) {
      if (reopenError instanceof ApiError) setError(reopenError.message)
      else setError('Unable to reopen fiscal period.')
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Fiscal periods require billing permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Fiscal Periods</Typography>
            <Typography color="text.secondary">Accounting periods from /api/fiscal-periods.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>New period</Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<FiscalPeriodSurfaceFallback />}>
          <FiscalPeriodDataGrid
            rows={rows}
            isLoading={isLoading}
            onEdit={openEdit}
            onClosePeriod={(row) => void handleClosePeriod(row)}
            onReopenPeriod={(row) => void handleReopenPeriod(row)}
          />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
        <Suspense fallback={<FiscalPeriodSurfaceFallback />}>
          <FiscalPeriodEditorDialog open={isEditorOpen} mode={editorMode} fiscalPeriodId={selectedId} onClose={() => setIsEditorOpen(false)} onSaved={(period, mode) => void handleSaved(period, mode)} />
        </Suspense>
      ) : null}
    </Stack>
  )
}
