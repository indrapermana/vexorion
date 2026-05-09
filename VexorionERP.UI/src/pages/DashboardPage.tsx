import { Stack } from '@vexorion/ui'
import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../app/CurrencyContext'
import type { CustomerListItemResponse } from '../types/api'
import { useApAgingQuery, useArAgingQuery, useCustomersQuery, useFinanceSnapshotQuery, useSalesOrdersQuery } from './dashboard/queries'
import type { AgingPoint, BalancePoint, CashFlowPoint, CashRowView, QuickStat, RecentOrderView, TopCustomerView } from './dashboard/types'
import DashboardSectionLoader from './dashboard/components/DashboardSectionLoader'

const DashboardHeaderFilters = lazy(() => import('./dashboard/components/DashboardHeaderFilters'))
const DashboardKpiCards = lazy(() => import('./dashboard/components/DashboardKpiCards'))
const DashboardChartsSection = lazy(() => import('./dashboard/components/DashboardChartsSection'))
const DashboardHealthSection = lazy(() => import('./dashboard/components/DashboardHealthSection'))
const DashboardQuickStatsSection = lazy(() => import('./dashboard/components/DashboardQuickStatsSection'))
const DashboardAgingSection = lazy(() => import('./dashboard/components/DashboardAgingSection'))
const DashboardTopCustomersSection = lazy(() => import('./dashboard/components/DashboardTopCustomersSection'))
const DashboardRecentOrdersSection = lazy(() => import('./dashboard/components/DashboardRecentOrdersSection'))
const DashboardCashFlowTable = lazy(() => import('./dashboard/components/DashboardCashFlowTable'))

const periodOptions = [7, 30, 90, 180]

export default function DashboardPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodDays, setPeriodDays] = useState(30)

  const financeQuery = useFinanceSnapshotQuery(asOfDate, periodDays)
  const arAgingQuery = useArAgingQuery(asOfDate)
  const apAgingQuery = useApAgingQuery(asOfDate)
  const salesOrdersQuery = useSalesOrdersQuery()
  const customersQuery = useCustomersQuery()

  const snapshot = financeQuery.data ?? null
  const arAging = arAgingQuery.data ?? null
  const apAging = apAgingQuery.data ?? null
  const salesOrders = useMemo(() => salesOrdersQuery.data ?? [], [salesOrdersQuery.data])
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])

  const errorMessage = useMemo(() => {
    if (financeQuery.error instanceof Error) return financeQuery.error.message
    if (arAgingQuery.error instanceof Error) return arAgingQuery.error.message
    if (apAgingQuery.error instanceof Error) return apAgingQuery.error.message
    if (salesOrdersQuery.error instanceof Error) return salesOrdersQuery.error.message
    if (customersQuery.error instanceof Error) return customersQuery.error.message
    return null
  }, [financeQuery.error, arAgingQuery.error, apAgingQuery.error, salesOrdersQuery.error, customersQuery.error])

  const cashRows = useMemo<CashRowView[]>(
    () => [
      { id: 'CASH-IN', owner: t('dashboard.cashRows.customerReceipts'), status: t('dashboard.cashRows.inflow'), amount: formatMoney(snapshot?.cashInInPeriod ?? 0) },
      { id: 'CASH-OUT', owner: t('dashboard.cashRows.vendorPayouts'), status: t('dashboard.cashRows.outflow'), amount: formatMoney(snapshot?.cashOutInPeriod ?? 0) },
      { id: 'NET', owner: t('dashboard.cashRows.windowDays', { days: periodDays }), status: (snapshot?.netCashInPeriod ?? 0) >= 0 ? t('dashboard.cashRows.positive') : t('dashboard.cashRows.negative'), amount: formatMoney(snapshot?.netCashInPeriod ?? 0) },
    ],
    [snapshot, periodDays, t],
  )

  const customersById = useMemo(() => {
    const map = new Map<string, CustomerListItemResponse>()
    for (const customer of customers) {
      map.set(customer.id, customer)
    }
    return map
  }, [customers])

  const getCustomerLabel = useCallback((customerId: string) => {
    const customer = customersById.get(customerId)
    if (!customer) return t('dashboard.common.unknownCustomer')
    return customer.name || customer.customerNumber || t('dashboard.common.unknownCustomer')
  }, [customersById, t])

  const getSalesOrderStatusLabel = useCallback((status: number) => {
    if (status === 1) return t('dashboard.recentOrders.status.draft')
    if (status === 2) return t('dashboard.recentOrders.status.confirmed')
    if (status === 3) return t('dashboard.recentOrders.status.partiallyProcessed')
    if (status === 4) return t('dashboard.recentOrders.status.completed')
    if (status === 5) return t('dashboard.recentOrders.status.cancelled')
    return t('dashboard.recentOrders.status.unknown', { status })
  }, [t])

  // Generate mock trend data for charts
  const cashFlowChartData = useMemo<CashFlowPoint[]>(() => {
    const days = periodDays
    const data: CashFlowPoint[] = []
    const cashIn = snapshot?.cashInInPeriod ?? 0
    const cashOut = snapshot?.cashOutInPeriod ?? 0
    const dailyIn = cashIn / days
    const dailyOut = cashOut / days
    
    for (let i = 0; i <= days; i += Math.max(1, Math.floor(days / 7))) {
      const offsetIn = 0.7 + ((i * 13) % 25) / 100
      const offsetOut = 0.7 + ((i * 17) % 25) / 100
      data.push({
        day: i,
        inflow: Math.round(dailyIn * Math.max(i, 1) * offsetIn),
        outflow: Math.round(dailyOut * Math.max(i, 1) * offsetOut),
      })
    }
    return data
  }, [snapshot, periodDays])

  const receivablesVsPayablesData = useMemo<BalancePoint[]>(() => {
    return [
      {
        name: t('dashboard.summary.receivables'),
        open: snapshot?.receivablesOpen ?? 0,
        overdue: snapshot?.receivablesOverdue ?? 0,
      },
      {
        name: t('dashboard.summary.payables'),
        open: snapshot?.payablesOpen ?? 0,
        overdue: snapshot?.payablesOverdue ?? 0,
      },
    ]
  }, [snapshot, t])

  const totalReceivables = (snapshot?.receivablesOpen ?? 0) + (snapshot?.receivablesOverdue ?? 0)
  const totalPayables = (snapshot?.payablesOpen ?? 0) + (snapshot?.payablesOverdue ?? 0)
  const receivablesHealthPercent = totalReceivables > 0 ? Math.round(((snapshot?.receivablesOpen ?? 0) / totalReceivables) * 100) : 100
  const payablesHealthPercent = totalPayables > 0 ? Math.round(((snapshot?.payablesOpen ?? 0) / totalPayables) * 100) : 100

  // Aging breakdown data for AR
  const arAgingData: AgingPoint[] = !arAging?.totals
    ? []
    : [
      { name: 'Current', value: arAging.totals.current },
      { name: '1-30 Days', value: arAging.totals.due1To30 },
      { name: '31-60 Days', value: arAging.totals.due31To60 },
      { name: '61-90 Days', value: arAging.totals.due61To90 },
      { name: '90+ Days', value: arAging.totals.dueOver90 },
    ].filter((item) => item.value > 0)

  // Aging breakdown data for AP
  const apAgingData: AgingPoint[] = !apAging?.totals
    ? []
    : [
      { name: 'Current', value: apAging.totals.current },
      { name: '1-30 Days', value: apAging.totals.due1To30 },
      { name: '31-60 Days', value: apAging.totals.due31To60 },
      { name: '61-90 Days', value: apAging.totals.due61To90 },
      { name: '90+ Days', value: apAging.totals.dueOver90 },
    ].filter((item) => item.value > 0)

  // Top customers by sales amount
  const topCustomers = useMemo<TopCustomerView[]>(() => {
    const aggregated = new Map<string, { total: number; latestOrderNumber: string }>()
    for (const order of salesOrders) {
      const existing = aggregated.get(order.customerId)
      aggregated.set(order.customerId, {
        total: (existing?.total ?? 0) + order.totalAmount,
        latestOrderNumber: order.orderNumber || existing?.latestOrderNumber || '-',
      })
    }

    return [...aggregated.entries()]
      .map(([customerId, value]) => ({ customerId, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((entry, idx) => ({
        id: `${entry.customerId}-${idx}`,
        rank: idx + 1,
        customerLabel: getCustomerLabel(entry.customerId),
        orderReference: entry.latestOrderNumber,
        amount: entry.total,
      }))
  }, [getCustomerLabel, salesOrders])

  const recentOrders = useMemo<RecentOrderView[]>(() => {
    return [...salesOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 8)
      .map((order) => ({
        id: order.id,
        orderReference: order.orderNumber,
        customerLabel: getCustomerLabel(order.customerId),
        orderDateLabel: new Date(order.orderDate).toLocaleDateString(),
        status: order.status,
          statusLabel: getSalesOrderStatusLabel(order.status),
        amount: order.totalAmount,
      }))
        }, [getCustomerLabel, getSalesOrderStatusLabel, salesOrders])

  // Quick stats calculations
  const quickStats = useMemo<QuickStat[]>(() => {
    const ar = snapshot?.receivablesOpen ?? 0
    const ap = snapshot?.payablesOpen ?? 0
    const arOverdue = snapshot?.receivablesOverdue ?? 0
    const apOverdue = snapshot?.payablesOverdue ?? 0

    // AR Collection Efficiency = Current AR / Total AR
    const arCollectionRate = totalReceivables > 0 ? Math.round(((snapshot?.receivablesOpen ?? 0) / totalReceivables) * 100) : 0
    
    // AP Payment Rate = Current AP / Total AP
    const apPaymentRate = totalPayables > 0 ? Math.round(((snapshot?.payablesOpen ?? 0) / totalPayables) * 100) : 0
    
    // Overdue ratio = Overdue amount / Total
    const arOverdueRatio = totalReceivables > 0 ? ((arOverdue / totalReceivables) * 100).toFixed(1) : '0.0'
    const apOverdueRatio = totalPayables > 0 ? ((apOverdue / totalPayables) * 100).toFixed(1) : '0.0'
    
    // Working Capital = AR + Inventory - AP (we're using receivables for now)
    const workingCapital = ar - ap

    return [
      { label: t('dashboard.quickStats.arCollectionRate'), value: `${arCollectionRate}%`, trend: 'positive' as const },
      { label: t('dashboard.quickStats.apPaymentRate'), value: `${apPaymentRate}%`, trend: 'positive' as const },
      { label: t('dashboard.quickStats.arOverduePercent'), value: `${arOverdueRatio}%`, trend: arOverdueRatio === '0.0' ? 'positive' : 'negative' as const },
      { label: t('dashboard.quickStats.apOverduePercent'), value: `${apOverdueRatio}%`, trend: apOverdueRatio === '0.0' ? 'positive' : 'negative' as const },
      { label: t('dashboard.quickStats.workingCapital'), value: formatMoney(workingCapital), trend: workingCapital >= 0 ? 'positive' : 'negative' as const },
    ]
  }, [snapshot, t, totalReceivables, totalPayables])

  return (
    <Stack spacing={3}>
      <Suspense fallback={<DashboardSectionLoader minHeight={180} />}>
        <DashboardHeaderFilters
          t={t}
          asOfDate={asOfDate}
          periodDays={periodDays}
          periodOptions={periodOptions}
          error={errorMessage ?? (financeQuery.isError ? t('dashboard.errors.loadMetrics') : null)}
          onAsOfDateChange={setAsOfDate}
          onPeriodChange={setPeriodDays}
        />
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={220} />}>
        {financeQuery.isPending ? <DashboardSectionLoader minHeight={220} /> : <DashboardKpiCards t={t} snapshot={snapshot} periodDays={periodDays} />}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={320} />}>
        {financeQuery.isPending ? (
          <DashboardSectionLoader minHeight={320} />
        ) : (
          <DashboardChartsSection
            t={t}
            cashFlowChartData={cashFlowChartData}
            receivablesVsPayablesData={receivablesVsPayablesData}
          />
        )}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={220} />}>
        {financeQuery.isPending ? (
          <DashboardSectionLoader minHeight={220} />
        ) : (
          <DashboardHealthSection
            t={t}
            receivablesHealthPercent={receivablesHealthPercent}
            payablesHealthPercent={payablesHealthPercent}
            totalReceivables={totalReceivables}
            totalPayables={totalPayables}
          />
        )}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={140} />}>
        {financeQuery.isPending ? <DashboardSectionLoader minHeight={140} /> : <DashboardQuickStatsSection t={t} quickStats={quickStats} />}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={340} />}>
        {arAgingQuery.isPending || apAgingQuery.isPending ? (
          <DashboardSectionLoader minHeight={340} />
        ) : (
          <DashboardAgingSection
            t={t}
            arAgingData={arAgingData}
            apAgingData={apAgingData}
            arTotals={arAging?.totals ?? null}
            apTotals={apAging?.totals ?? null}
          />
        )}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={260} />}>
        {salesOrdersQuery.isPending || customersQuery.isPending ? (
          <DashboardSectionLoader minHeight={260} />
        ) : (
          <DashboardTopCustomersSection t={t} topCustomers={topCustomers} />
        )}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={260} />}>
        {salesOrdersQuery.isPending || customersQuery.isPending ? (
          <DashboardSectionLoader minHeight={260} />
        ) : (
          <DashboardRecentOrdersSection t={t} recentOrders={recentOrders} />
        )}
      </Suspense>

      <Suspense fallback={<DashboardSectionLoader minHeight={240} />}>
        {financeQuery.isPending ? <DashboardSectionLoader minHeight={240} /> : <DashboardCashFlowTable t={t} periodDays={periodDays} cashRows={cashRows} />}
      </Suspense>
    </Stack>
  )
}