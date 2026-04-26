import { useCallback, useEffect, useState } from 'react'
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getApAgingReport, getArAgingReport, getTrialBalanceReport } from '../../../lib/api'
import type { ApAgingReportResponse, ArAgingReportResponse, TrialBalanceReportResponse } from '../../../types/api'

export default function ReportsPage() {
  const { isAuthenticated } = useAuth()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [arAging, setArAging] = useState<ArAgingReportResponse | null>(null)
  const [apAging, setApAging] = useState<ApAgingReportResponse | null>(null)
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    if (!isAuthenticated) {
      setArAging(null)
      setApAging(null)
      setTrialBalance(null)
      return
    }

    setError(null)
    try {
      const [ar, ap, tb] = await Promise.all([
        getArAgingReport(asOfDate),
        getApAgingReport(asOfDate),
        getTrialBalanceReport(asOfDate),
      ])
      setArAging(ar)
      setApAging(ap)
      setTrialBalance(tb)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load reporting data.')
    }
  }, [asOfDate, isAuthenticated])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Reports require billing permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>Finance Reports</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>A/R aging, A/P aging, and trial balance.</Typography>
        <TextField
          type="date"
          label="As-of date"
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>A/R Aging Summary</Typography>
        <Typography color="text.secondary">Total: {arAging ? arAging.totals.total.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Customers: {arAging ? arAging.items.length : 0}</Typography>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>A/P Aging Summary</Typography>
        <Typography color="text.secondary">Total: {apAging ? apAging.totals.total.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Suppliers: {apAging ? apAging.items.length : 0}</Typography>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Trial Balance Summary</Typography>
        <Typography color="text.secondary">Total Debit: {trialBalance ? trialBalance.totalDebit.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Total Credit: {trialBalance ? trialBalance.totalCredit.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Accounts: {trialBalance ? trialBalance.lines.length : 0}</Typography>
      </Paper>
    </Stack>
  )
}
