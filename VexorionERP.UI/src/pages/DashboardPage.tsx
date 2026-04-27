import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import {
  Alert,
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../app/AuthContext'
import { ApiError, getFinanceDashboardSnapshot } from '../lib/api'
import type { FinanceDashboardSnapshotResponse } from '../types/api'

const periodOptions = [7, 30, 90, 180]

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodDays, setPeriodDays] = useState(30)
  const [snapshot, setSnapshot] = useState<FinanceDashboardSnapshotResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const quickCards = [
    {
      title: t('dashboard.quickCards.identityPermissions.title'),
      description: t('dashboard.quickCards.identityPermissions.description'),
      icon: <SecurityRoundedIcon fontSize="large" />,
    },
    {
      title: t('dashboard.quickCards.catalogInventory.title'),
      description: t('dashboard.quickCards.catalogInventory.description'),
      icon: <StorefrontRoundedIcon fontSize="large" />,
    },
    {
      title: t('dashboard.quickCards.cqrsModules.title'),
      description: t('dashboard.quickCards.cqrsModules.description'),
      icon: <InsightsRoundedIcon fontSize="large" />,
    },
  ]

  const summaryCards = useMemo(
    () => [
      {
        title: t('dashboard.summary.openReceivables'),
        value: formatCurrency(snapshot?.receivablesOpen ?? 0),
        change: t('dashboard.summary.overdueAmount', { amount: formatCurrency(snapshot?.receivablesOverdue ?? 0) }),
        icon: <PaidRoundedIcon />,
      },
      {
        title: t('dashboard.summary.openPayables'),
        value: formatCurrency(snapshot?.payablesOpen ?? 0),
        change: t('dashboard.summary.overdueAmount', { amount: formatCurrency(snapshot?.payablesOverdue ?? 0) }),
        icon: <Inventory2RoundedIcon />,
      },
      {
        title: t('dashboard.summary.revenuePeriod', { days: periodDays }),
        value: formatCurrency(snapshot?.revenueInPeriod ?? 0),
        change: t('dashboard.summary.netCashAmount', { amount: formatCurrency(snapshot?.netCashInPeriod ?? 0) }),
        icon: <InsightsRoundedIcon />,
      },
    ],
    [snapshot, periodDays, t],
  )

  const cashRows = useMemo(
    () => [
      { id: 'CASH-IN', owner: t('dashboard.cashRows.customerReceipts'), status: t('dashboard.cashRows.inflow'), amount: formatCurrency(snapshot?.cashInInPeriod ?? 0) },
      { id: 'CASH-OUT', owner: t('dashboard.cashRows.vendorPayouts'), status: t('dashboard.cashRows.outflow'), amount: formatCurrency(snapshot?.cashOutInPeriod ?? 0) },
      { id: 'NET', owner: t('dashboard.cashRows.windowDays', { days: periodDays }), status: (snapshot?.netCashInPeriod ?? 0) >= 0 ? t('dashboard.cashRows.positive') : t('dashboard.cashRows.negative'), amount: formatCurrency(snapshot?.netCashInPeriod ?? 0) },
    ],
    [snapshot, periodDays, t],
  )

  const loadSnapshot = useCallback(async () => {
    if (!isAuthenticated) {
      setSnapshot(null)
      return
    }

    setError(null)
    try {
      const data = await getFinanceDashboardSnapshot(asOfDate, periodDays)
      setSnapshot(data)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError(t('dashboard.errors.loadMetrics'))
    }
  }, [asOfDate, isAuthenticated, periodDays, t])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper elevation={0} className="hero-panel dashboard-banner">
            <Stack spacing={2.5}>
              <Typography variant="h2">{t('dashboard.hero.title')}</Typography>
              <Typography variant="body1" sx={{ maxWidth: 760 }}>
                {t('dashboard.hero.description')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label={t('dashboard.filters.asOfDate')}
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  select
                  label={t('dashboard.filters.window')}
                  value={periodDays}
                  onChange={(event) => setPeriodDays(Number(event.target.value))}
                  SelectProps={{ native: true }}
                  sx={{ maxWidth: 220 }}
                >
                  {periodOptions.map((option) => (
                    <option key={option} value={option}>{t('dashboard.filters.daysOption', { days: option })}</option>
                  ))}
                </TextField>
              </Stack>
              {isAuthenticated && user ? (
                <Stack spacing={1}>
                  <Typography variant="h6">{t('dashboard.user.signedInAs', { name: user.firstName ?? user.userName })}</Typography>
                  <Typography color="text.secondary">{t('dashboard.user.tenantAndEmail', { tenantId: user.tenantId, email: user.email })}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {user.permissions.slice(0, 6).map((permission) => (
                      <Chip key={permission} label={permission} size="small" />
                    ))}
                  </Box>
                </Stack>
              ) : (
                <Chip color="secondary" label={t('dashboard.user.signInHint')} sx={{ alignSelf: 'flex-start' }} />
              )}
              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper elevation={0} className="panel-card">
            <Typography variant="h6" sx={{ mb: 2 }}>{t('dashboard.systemFocus.title')}</Typography>
            <Stack spacing={1.5}>
              <Typography color="text.secondary">{t('dashboard.systemFocus.line1')}</Typography>
              <Typography color="text.secondary">{t('dashboard.systemFocus.line2')}</Typography>
            </Stack>
          </Paper>
        </Grid>

        {summaryCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} className="stat-card dashboard-stat-card">
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" sx={{ mb: 0.5 }}>{card.title}</Typography>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>{card.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{card.change}</Typography>
                </Box>
                <Box className="metric-icon">{card.icon}</Box>
              </Stack>
            </Paper>
          </Grid>
        ))}

        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper elevation={0} className="panel-card">
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('dashboard.cashSnapshot.title')}</Typography>
              <Chip label={t('dashboard.cashSnapshot.window', { days: periodDays })} size="small" />
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.table.reference')}</TableCell>
                    <TableCell>{t('dashboard.table.source')}</TableCell>
                    <TableCell>{t('dashboard.table.direction')}</TableCell>
                    <TableCell align="right">{t('dashboard.table.amount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color={row.status === t('dashboard.cashRows.positive') || row.status === t('dashboard.cashRows.inflow') ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell align="right">{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Stack spacing={3}>
            <Paper elevation={0} className="panel-card">
              <Typography variant="h6" sx={{ mb: 2 }}>{t('dashboard.financeSnapshot.title')}</Typography>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">{t('dashboard.financeSnapshot.receivablesOverdue')}</Typography>
                <Typography variant="h5">{formatCurrency(snapshot?.receivablesOverdue ?? 0)}</Typography>
                <Typography variant="body2" color="text.secondary">{t('dashboard.financeSnapshot.payablesOverdue')}</Typography>
                <Typography variant="h5">{formatCurrency(snapshot?.payablesOverdue ?? 0)}</Typography>
              </Stack>
            </Paper>

            <Paper elevation={0} className="panel-card">
              <Typography variant="h6" sx={{ mb: 2 }}>{t('dashboard.pillars.title')}</Typography>
              <Stack spacing={2}>
                {quickCards.map((card) => (
                  <Box key={card.title} className="mini-pillar-row">
                    <Box className="pillar-icon mini-pillar-icon">{card.icon}</Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{card.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{card.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}