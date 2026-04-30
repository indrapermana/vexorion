import {
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
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { RecentOrderView } from '../types'

type DashboardRecentOrdersSectionProps = {
  t: TFunction
  recentOrders: RecentOrderView[]
}

function getStatusColor(status: number): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  if (status === 4) return 'success'
  if (status === 3) return 'warning'
  if (status === 5) return 'error'
  if (status === 2) return 'primary'
  return 'default'
}

export default function DashboardRecentOrdersSection({ t, recentOrders }: DashboardRecentOrdersSectionProps) {
  const { formatMoney } = useCurrency()
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('dashboard.recentOrders.title')}</Typography>
            <Chip label={t('dashboard.recentOrders.totalOrders', { count: recentOrders.length })} size="small" variant="outlined" />
          </Stack>
          {recentOrders.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <TableCell>{t('dashboard.recentOrders.columns.orderNumber')}</TableCell>
                    <TableCell>{t('dashboard.recentOrders.columns.customer')}</TableCell>
                    <TableCell>{t('dashboard.recentOrders.columns.orderDate')}</TableCell>
                    <TableCell>{t('dashboard.recentOrders.columns.status')}</TableCell>
                    <TableCell align="right">{t('dashboard.recentOrders.columns.amount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{order.orderReference}</TableCell>
                      <TableCell>{order.customerLabel}</TableCell>
                      <TableCell>{order.orderDateLabel}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={order.statusLabel}
                          color={getStatusColor(order.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatMoney(order.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{t('dashboard.recentOrders.empty')}</Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  )
}
