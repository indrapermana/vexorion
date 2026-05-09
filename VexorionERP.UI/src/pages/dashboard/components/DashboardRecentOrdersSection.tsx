import { VxChip, VxGrid, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12 }}>
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <VxTypography variant="h6">{t('dashboard.recentOrders.title')}</VxTypography>
            <VxChip label={t('dashboard.recentOrders.totalOrders', { count: recentOrders.length })} size="small" variant="outlined" />
          </VxStack>
          {recentOrders.length > 0 ? (
            <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow sx={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <VxTableCell>{t('dashboard.recentOrders.columns.orderNumber')}</VxTableCell>
                    <VxTableCell>{t('dashboard.recentOrders.columns.customer')}</VxTableCell>
                    <VxTableCell>{t('dashboard.recentOrders.columns.orderDate')}</VxTableCell>
                    <VxTableCell>{t('dashboard.recentOrders.columns.status')}</VxTableCell>
                    <VxTableCell align="right">{t('dashboard.recentOrders.columns.amount')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {recentOrders.map((order) => (
                    <VxTableRow key={order.id} hover>
                      <VxTableCell sx={{ fontWeight: 600 }}>{order.orderReference}</VxTableCell>
                      <VxTableCell>{order.customerLabel}</VxTableCell>
                      <VxTableCell>{order.orderDateLabel}</VxTableCell>
                      <VxTableCell>
                        <VxChip
                          size="small"
                          label={order.statusLabel}
                          color={getStatusColor(order.status)}
                          variant="outlined"
                        />
                      </VxTableCell>
                      <VxTableCell align="right">{formatMoney(order.amount)}</VxTableCell>
                    </VxTableRow>
                  ))}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          ) : (
            <VxTypography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>{t('dashboard.recentOrders.empty')}</VxTypography>
          )}
        </VxPaper>
      </VxGrid>
    </VxGrid>
  )
}
