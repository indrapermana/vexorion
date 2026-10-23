import { VxChip, VxGrid, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { CashRowView } from '../types'

type DashboardCashFlowTableProps = {
  t: TFunction
  periodDays: number
  cashRows: CashRowView[]
}

export default function DashboardCashFlowTable({ t, periodDays, cashRows }: DashboardCashFlowTableProps) {
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <VxTypography component="h2" variant="h6">{t('dashboard.cashSnapshot.title')}</VxTypography>
            <VxChip label={t('dashboard.cashSnapshot.window', { days: periodDays })} size="small" variant="outlined" />
          </VxStack>
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <VxTableCell>{t('dashboard.table.reference')}</VxTableCell>
                  <VxTableCell>{t('dashboard.table.source')}</VxTableCell>
                  <VxTableCell>{t('dashboard.table.direction')}</VxTableCell>
                  <VxTableCell align="right">{t('dashboard.table.amount')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {cashRows.map((row) => (
                  <VxTableRow key={row.id} hover>
                    <VxTableCell sx={{ fontWeight: 600 }}>{row.id}</VxTableCell>
                    <VxTableCell>{row.owner}</VxTableCell>
                    <VxTableCell>
                      <VxChip
                        label={row.status}
                        size="small"
                        color={row.status === t('dashboard.cashRows.positive') || row.status === t('dashboard.cashRows.inflow') ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </VxTableCell>
                    <VxTableCell align="right" sx={{ fontWeight: 600 }}>{row.amount}</VxTableCell>
                  </VxTableRow>
                ))}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
