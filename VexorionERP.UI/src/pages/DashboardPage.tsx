import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import {
  Box,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useAuth } from '../app/AuthContext'

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

const summaryCards = [
  { title: 'Active modules', value: '14', change: '+3 this sprint', icon: <InsightsRoundedIcon /> },
  { title: 'Catalog items', value: '128', change: '12 pending review', icon: <Inventory2RoundedIcon /> },
  { title: 'Collected revenue', value: '$84.2k', change: '+8.4% vs last month', icon: <PaidRoundedIcon /> },
]

const recentRows = [
  { id: 'SO-2041', owner: 'Operations', status: 'Ready', amount: '$12,480' },
  { id: 'INV-1188', owner: 'Finance', status: 'Pending', amount: '$8,120' },
  { id: 'PO-9902', owner: 'Procurement', status: 'Approved', amount: '$4,960' },
]

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper elevation={0} className="hero-panel dashboard-banner">
            <Stack spacing={2.5}>
              <Typography variant="h2">Run Vexorion like an operations dashboard, not a placeholder homepage.</Typography>
              <Typography variant="body1" sx={{ maxWidth: 760 }}>
                The shell is now laid out like a CRUD admin workspace with a dedicated sidebar, dense summary cards, and tabular activity zones.
              </Typography>
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
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper elevation={0} className="panel-card">
            <Typography variant="h6" sx={{ mb: 2 }}>System focus</Typography>
            <Stack spacing={1.5}>
              <Typography color="text.secondary">Use the sidebar to move between ERP modules grouped by sales, procurement, and inventory.</Typography>
              <Typography color="text.secondary">The current design direction now reads like an admin console instead of a landing page.</Typography>
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
              <Typography variant="h6">Recent records</Typography>
              <Chip label="CRUD-ready table zone" size="small" />
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color={row.status === 'Ready' ? 'primary' : 'default'} />
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
              <Typography variant="h6" sx={{ mb: 2 }}>Access snapshot</Typography>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">Primary role</Typography>
                <Typography variant="h5">{isAuthenticated && user ? user.roles[0] ?? 'User' : 'Guest'}</Typography>
                <Typography variant="body2" color="text.secondary">Available permission count</Typography>
                <Typography variant="h5">{isAuthenticated && user ? user.permissions.length : 0}</Typography>
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