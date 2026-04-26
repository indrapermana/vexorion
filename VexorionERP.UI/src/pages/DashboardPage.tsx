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
import { useAuth } from '../app/AuthContext'
import { ApiError, getFinanceDashboardSnapshot } from '../lib/api'
import type { FinanceDashboardSnapshotResponse } from '../types/api'

const quickCards = [
  {
    title: 'Identity and permissions',
    description: 'JWT login, role claims, and permission policies are already exposed by the API.',
    icon: <SecurityRoundedIcon fontSize="large" />,
  },
  {
    title: 'Catalog and inventory',
    description: 'Products, warehouses, and balances are ready to support operational flows.',
    icon: <StorefrontRoundedIcon fontSize="large" />,
  },
  {
    title: 'CQRS-backed modules',
    description: 'The frontend can evolve page by page without collapsing service boundaries.',
    icon: <InsightsRoundedIcon fontSize="large" />,
  },
]

const periodOptions = [7, 30, 90, 180]

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodDays, setPeriodDays] = useState(30)
  const [snapshot, setSnapshot] = useState<FinanceDashboardSnapshotResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const summaryCards = useMemo(
    () => [
      {
        title: 'Open receivables',
        value: formatCurrency(snapshot?.receivablesOpen ?? 0),
        change: `Overdue ${formatCurrency(snapshot?.receivablesOverdue ?? 0)}`,
        icon: <PaidRoundedIcon />,
      },
      {
        title: 'Open payables',
        value: formatCurrency(snapshot?.payablesOpen ?? 0),
        change: `Overdue ${formatCurrency(snapshot?.payablesOverdue ?? 0)}`,
        icon: <Inventory2RoundedIcon />,
      },
      {
        title: `Revenue (${periodDays}d)`,
        value: formatCurrency(snapshot?.revenueInPeriod ?? 0),
        change: `Net cash ${formatCurrency(snapshot?.netCashInPeriod ?? 0)}`,
        icon: <InsightsRoundedIcon />,
      },
    ],
    [snapshot, periodDays],
  )

  const cashRows = useMemo(
    () => [
      { id: 'CASH-IN', owner: 'Customer receipts', status: 'Inflow', amount: formatCurrency(snapshot?.cashInInPeriod ?? 0) },
      { id: 'CASH-OUT', owner: 'Vendor payouts', status: 'Outflow', amount: formatCurrency(snapshot?.cashOutInPeriod ?? 0) },
      { id: 'NET', owner: `${periodDays}-day window`, status: (snapshot?.netCashInPeriod ?? 0) >= 0 ? 'Positive' : 'Negative', amount: formatCurrency(snapshot?.netCashInPeriod ?? 0) },
    ],
    [snapshot, periodDays],
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
      else setError('Unable to load dashboard metrics.')
    }
  }, [asOfDate, isAuthenticated, periodDays])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper elevation={0} className="hero-panel dashboard-banner">
            <Stack spacing={2.5}>
              <Typography variant="h2">Run Vexorion like an operations dashboard, not a placeholder homepage.</Typography>
              <Typography variant="body1" sx={{ maxWidth: 760 }}>
                Finance KPIs update by as-of date and analysis window so operations can see receivables, payables, revenue, and cash momentum in one screen.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label="As-of date"
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  select
                  label="Window"
                  value={periodDays}
                  onChange={(event) => setPeriodDays(Number(event.target.value))}
                  SelectProps={{ native: true }}
                  sx={{ maxWidth: 220 }}
                >
                  {periodOptions.map((option) => (
                    <option key={option} value={option}>{option} days</option>
                  ))}
                </TextField>
              </Stack>
              {isAuthenticated && user ? (
                <Stack spacing={1}>
                  <Typography variant="h6">Signed in as {user.firstName ?? user.userName}</Typography>
                  <Typography color="text.secondary">Tenant {user.tenantId} · {user.email}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {user.permissions.slice(0, 6).map((permission) => (
                      <Chip key={permission} label={permission} size="small" />
                    ))}
                  </Box>
                </Stack>
              ) : (
                <Chip color="secondary" label="Sign in to unlock protected modules" sx={{ alignSelf: 'flex-start' }} />
              )}
              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper elevation={0} className="panel-card">
            <Typography variant="h6" sx={{ mb: 2 }}>System focus</Typography>
            <Stack spacing={1.5}>
              <Typography color="text.secondary">Use the reporting and finance modules to drill into aging and trial balance details from these KPI cards.</Typography>
              <Typography color="text.secondary">Dashboard values are tenant-scoped and filtered by the selected as-of date and window.</Typography>
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
              <Typography variant="h6">Cash movement snapshot</Typography>
              <Chip label={`${periodDays}-day window`} size="small" />
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color={row.status === 'Positive' || row.status === 'Inflow' ? 'primary' : 'default'} />
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
              <Typography variant="h6" sx={{ mb: 2 }}>Finance snapshot</Typography>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">Receivables overdue</Typography>
                <Typography variant="h5">{formatCurrency(snapshot?.receivablesOverdue ?? 0)}</Typography>
                <Typography variant="body2" color="text.secondary">Payables overdue</Typography>
                <Typography variant="h5">{formatCurrency(snapshot?.payablesOverdue ?? 0)}</Typography>
              </Stack>
            </Paper>

            <Paper elevation={0} className="panel-card">
              <Typography variant="h6" sx={{ mb: 2 }}>Workspace pillars</Typography>
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