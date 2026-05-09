import { PersonRoundedIcon } from '@vexorion/ui'
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
} from '@vexorion/ui'
import type { TFunction } from 'i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { TopCustomerView } from '../types'

type DashboardTopCustomersSectionProps = {
  t: TFunction
  topCustomers: TopCustomerView[]
}

export default function DashboardTopCustomersSection({ t, topCustomers }: DashboardTopCustomersSectionProps) {
  const { formatMoney } = useCurrency()
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <PersonRoundedIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">{t('dashboard.topCustomers.title')}</Typography>
            </Stack>
            <Chip label={t('dashboard.topCustomers.totalCustomers', { count: topCustomers.length })} size="small" variant="outlined" />
          </Stack>
          {topCustomers.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <TableCell align="center" sx={{ width: 50 }}>{t('dashboard.topCustomers.columns.rank')}</TableCell>
                    <TableCell>{t('dashboard.topCustomers.columns.customer')}</TableCell>
                    <TableCell>{t('dashboard.topCustomers.columns.reference')}</TableCell>
                    <TableCell align="right">{t('dashboard.topCustomers.columns.amount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell align="center">
                        <Chip
                          label={`#${customer.rank}`}
                          size="small"
                          color={customer.rank === 1 ? 'warning' : customer.rank <= 3 ? 'info' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{customer.customerLabel}</TableCell>
                      <TableCell>{customer.orderReference}</TableCell>
                      <TableCell align="right">{formatMoney(customer.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{t('dashboard.topCustomers.empty')}</Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  )
}
