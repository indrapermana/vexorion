import { Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { CashRowView } from '../types'

type DashboardCashFlowTableProps = {
  t: TFunction
  periodDays: number
  cashRows: CashRowView[]
}

export default function DashboardCashFlowTable({ t, periodDays, cashRows }: DashboardCashFlowTableProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('dashboard.cashSnapshot.title')}</Typography>
            <Chip label={t('dashboard.cashSnapshot.window', { days: periodDays })} size="small" variant="outlined" />
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <TableCell>{t('dashboard.table.reference')}</TableCell>
                  <TableCell>{t('dashboard.table.source')}</TableCell>
                  <TableCell>{t('dashboard.table.direction')}</TableCell>
                  <TableCell align="right">{t('dashboard.table.amount')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.id}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        size="small"
                        color={row.status === t('dashboard.cashRows.positive') || row.status === t('dashboard.cashRows.inflow') ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  )
}
