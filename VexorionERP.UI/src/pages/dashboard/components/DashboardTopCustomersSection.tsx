import { PersonRoundedIcon } from '@vexorion/ui'
import { VxChip, VxGrid, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <VxStack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <PersonRoundedIcon sx={{ color: 'primary.main' }} />
              <VxTypography variant="h6">{t('dashboard.topCustomers.title')}</VxTypography>
            </VxStack>
            <VxChip label={t('dashboard.topCustomers.totalCustomers', { count: topCustomers.length })} size="small" variant="outlined" />
          </VxStack>
          {topCustomers.length > 0 ? (
            <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <VxTableCell align="center" sx={{ width: 50 }}>{t('dashboard.topCustomers.columns.rank')}</VxTableCell>
                    <VxTableCell>{t('dashboard.topCustomers.columns.customer')}</VxTableCell>
                    <VxTableCell>{t('dashboard.topCustomers.columns.reference')}</VxTableCell>
                    <VxTableCell align="right">{t('dashboard.topCustomers.columns.amount')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {topCustomers.map((customer) => (
                    <VxTableRow key={customer.id} hover>
                      <VxTableCell align="center">
                        <VxChip
                          label={`#${customer.rank}`}
                          size="small"
                          color={customer.rank === 1 ? 'warning' : customer.rank <= 3 ? 'info' : 'default'}
                          variant="outlined"
                        />
                      </VxTableCell>
                      <VxTableCell sx={{ fontWeight: 600 }}>{customer.customerLabel}</VxTableCell>
                      <VxTableCell>{customer.orderReference}</VxTableCell>
                      <VxTableCell align="right">{formatMoney(customer.amount)}</VxTableCell>
                    </VxTableRow>
                  ))}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          ) : (
            <VxTypography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{t('dashboard.topCustomers.empty')}</VxTypography>
          )}
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
