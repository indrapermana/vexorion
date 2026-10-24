import { VxStack, VxTypography } from '@vexorion/ui'
import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../app/AuthContext'
import { useCurrency } from '../app/CurrencyContext'
import type { CustomerListItemResponse } from '../types/api'
import { useApAgingQuery, useArAgingQuery, useCustomersQuery, useFinanceSnapshotQuery, useSalesOrdersQuery, useTenantStorageSummaryQuery, useTenantStorageTopConsumersQuery } from './dashboard/queries'
import type { AgingPoint, BalancePoint, CashRowView, QuickStat, RecentOrderView, TopCustomerView } from './dashboard/types'
import DashboardSectionLoader from './dashboard/components/DashboardSectionLoader'
import { Permissions } from '../app/authorization'
import { PageHeader } from '../components/PagePrimitives'
import { getIntlLocale } from '../i18n/translationConstant'
import DashboardQuerySection from './dashboard/components/DashboardQuerySection'

const DashboardHeaderFilters = lazy(() => import('./dashboard/components/DashboardHeaderFilters'))
const DashboardKpiCards = lazy(() => import('./dashboard/components/DashboardKpiCards'))
const DashboardChartsSection = lazy(() => import('./dashboard/components/DashboardChartsSection'))
const DashboardHealthSection = lazy(() => import('./dashboard/components/DashboardHealthSection'))
const DashboardQuickStatsSection = lazy(() => import('./dashboard/components/DashboardQuickStatsSection'))
const DashboardAgingSection = lazy(() => import('./dashboard/components/DashboardAgingSection'))
const DashboardTopCustomersSection = lazy(() => import('./dashboard/components/DashboardTopCustomersSection'))
const DashboardRecentOrdersSection = lazy(() => import('./dashboard/components/DashboardRecentOrdersSection'))
const DashboardCashFlowTable = lazy(() => import('./dashboard/components/DashboardCashFlowTable'))
const DashboardStorageSection = lazy(() => import('./dashboard/components/DashboardStorageSection'))

const periodOptions = [7, 30, 90, 180]

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { formatMoney } = useCurrency()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodDays, setPeriodDays] = useState(30)

  const financeQuery = useFinanceSnapshotQuery(asOfDate, periodDays)
  const arAgingQuery = useArAgingQuery(asOfDate)
  const apAgingQuery = useApAgingQuery(asOfDate)
  const canViewSales = user?.permissions.includes(Permissions.sales.view) ?? false
  const canViewCustomers = user?.permissions.includes(Permissions.customers.view) ?? false
  const canViewStorage = user?.permissions.includes(Permissions.storageUsage.view) ?? false
  const salesOrdersQuery = useSalesOrdersQuery(canViewSales)
  const customersQuery = useCustomersQuery(canViewCustomers)
  const storageSummaryQuery = useTenantStorageSummaryQuery(user?.tenantId, canViewStorage)
  const storageTopConsumersQuery = useTenantStorageTopConsumersQuery(user?.tenantId, 5, canViewStorage)

  const snapshot = financeQuery.data ?? null
  const arAging = arAgingQuery.data ?? null
  const apAging = apAgingQuery.data ?? null
  const salesOrders = useMemo(() => salesOrdersQuery.data ?? [], [salesOrdersQuery.data])
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
  const storageSummary = storageSummaryQuery.data ?? null
  const storageTopConsumers = storageTopConsumersQuery.data ?? null

  const cashRows = useMemo<CashRowView[]>(
    () => [
      { id: 'CASH-IN', owner: t('dashboard.cashRows.customerReceipts'), status: t('dashboard.cashRows.inflow'), amount: formatMoney(snapshot?.cashInInPeriod ?? 0) },
      { id: 'CASH-OUT', owner: t('dashboard.cashRows.vendorPayouts'), status: t('dashboard.cashRows.outflow'), amount: formatMoney(snapshot?.cashOutInPeriod ?? 0) },
      { id: 'NET', owner: t('dashboard.cashRows.windowDays', { days: periodDays }), status: (snapshot?.netCashInPeriod ?? 0) === 0 ? t('dashboard.cashRows.balanced') : (snapshot?.netCashInPeriod ?? 0) > 0 ? t('dashboard.cashRows.positive') : t('dashboard.cashRows.negative'), amount: formatMoney(snapshot?.netCashInPeriod ?? 0) },
    ],
    [snapshot, periodDays, t, formatMoney],
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

  const receivablesVsPayablesData = useMemo<BalancePoint[]>(() => {
    return [
      {
        name: t('dashboard.summary.receivables'),
        open: (snapshot?.receivablesOpen ?? 0) - (snapshot?.receivablesOverdue ?? 0),
        overdue: snapshot?.receivablesOverdue ?? 0,
      },
      {
        name: t('dashboard.summary.payables'),
        open: (snapshot?.payablesOpen ?? 0) - (snapshot?.payablesOverdue ?? 0),
        overdue: snapshot?.payablesOverdue ?? 0,
      },
    ]
  }, [snapshot, t])

  const totalReceivables = snapshot?.receivablesOpen ?? 0
  const totalPayables = snapshot?.payablesOpen ?? 0
  const receivablesHealthPercent = totalReceivables > 0 ? Math.round(((totalReceivables - (snapshot?.receivablesOverdue ?? 0)) / totalReceivables) * 100) : 0
  const payablesHealthPercent = totalPayables > 0 ? Math.round(((totalPayables - (snapshot?.payablesOverdue ?? 0)) / totalPayables) * 100) : 0

  // Aging breakdown data for AR
  const arAgingData: AgingPoint[] = !arAging?.totals
    ? []
    : [
      { name: t('dashboard.aging.current'), value: arAging.totals.current },
      { name: t('dashboard.aging.days1To30'), value: arAging.totals.due1To30 },
      { name: t('dashboard.aging.days31To60'), value: arAging.totals.due31To60 },
      { name: t('dashboard.aging.days61To90'), value: arAging.totals.due61To90 },
      { name: t('dashboard.aging.daysOver90'), value: arAging.totals.dueOver90 },
    ].filter((item) => item.value > 0)

  // Aging breakdown data for AP
  const apAgingData: AgingPoint[] = !apAging?.totals
    ? []
    : [
      { name: t('dashboard.aging.current'), value: apAging.totals.current },
      { name: t('dashboard.aging.days1To30'), value: apAging.totals.due1To30 },
      { name: t('dashboard.aging.days31To60'), value: apAging.totals.due31To60 },
      { name: t('dashboard.aging.days61To90'), value: apAging.totals.due61To90 },
      { name: t('dashboard.aging.daysOver90'), value: apAging.totals.dueOver90 },
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
        orderDateLabel: new Date(order.orderDate).toLocaleDateString(getIntlLocale(i18n.resolvedLanguage)),
        status: order.status,
          statusLabel: getSalesOrderStatusLabel(order.status),
        amount: order.totalAmount,
      }))
        }, [getCustomerLabel, getSalesOrderStatusLabel, salesOrders, i18n.resolvedLanguage])

  const quickStats = useMemo<QuickStat[]>(() => {
    const ar = snapshot?.receivablesOpen ?? 0
    const ap = snapshot?.payablesOpen ?? 0
    const arOverdue = snapshot?.receivablesOverdue ?? 0
    const apOverdue = snapshot?.payablesOverdue ?? 0
    const percent = new Intl.NumberFormat(getIntlLocale(i18n.resolvedLanguage), { style: 'percent', maximumFractionDigits: 1 })
    const share = (amount: number, total: number) => total > 0 ? percent.format(amount / total) : t('dashboard.quickStats.notApplicable')

    return [
      { label: t('dashboard.quickStats.arCollectionRate'), value: share(ar - arOverdue, ar), description: t('dashboard.quickStats.currentShareDefinition') },
      { label: t('dashboard.quickStats.apPaymentRate'), value: share(ap - apOverdue, ap), description: t('dashboard.quickStats.currentShareDefinition') },
      { label: t('dashboard.quickStats.arOverduePercent'), value: share(arOverdue, ar), description: t('dashboard.quickStats.overdueShareDefinition') },
      { label: t('dashboard.quickStats.apOverduePercent'), value: share(apOverdue, ap), description: t('dashboard.quickStats.overdueShareDefinition') },
      { label: t('dashboard.quickStats.workingCapital'), value: formatMoney(ar - ap), description: t('dashboard.quickStats.netBalanceDefinition') },
    ]
  }, [snapshot, t, formatMoney, i18n.resolvedLanguage])

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('dashboard.hero.title')} />
      <VxStack component="section" aria-label={t('dashboard.sections.finance')} spacing={3} sx={{ minWidth: 0 }}>
        <VxStack component="section" aria-labelledby="dashboard-overview-title" spacing={2}>
          <Suspense fallback={<DashboardSectionLoader minHeight={100} />}>
            <DashboardHeaderFilters
              t={t}
              asOfDate={asOfDate}
              periodDays={periodDays}
              periodOptions={periodOptions}
              snapshot={snapshot}
              error={null}
              onAsOfDateChange={setAsOfDate}
              onPeriodChange={setPeriodDays}
            />
          </Suspense>
          <DashboardQuerySection label={t('dashboard.query.financeMetrics')} query={financeQuery} minHeight={220}>
            <Suspense fallback={<DashboardSectionLoader minHeight={220} />}>
              <DashboardKpiCards t={t} snapshot={snapshot} periodDays={periodDays} />
            </Suspense>
          </DashboardQuerySection>
        </VxStack>

        <VxStack component="section" aria-labelledby="dashboard-attention-title" spacing={2}>
          <VxTypography id="dashboard-attention-title" component="h2" variant="h6">{t('dashboard.sections.attention')}</VxTypography>
          <DashboardQuerySection label={t('dashboard.query.healthMetrics')} query={financeQuery} minHeight={220}>
            <Suspense fallback={<DashboardSectionLoader minHeight={220} />}>
              <DashboardHealthSection
                t={t}
                receivablesHealthPercent={receivablesHealthPercent}
                payablesHealthPercent={payablesHealthPercent}
                totalReceivables={totalReceivables}
                totalPayables={totalPayables}
              />
            </Suspense>
          </DashboardQuerySection>
          <Suspense fallback={<DashboardSectionLoader minHeight={340} />}>
            <DashboardAgingSection t={t} arAgingData={arAgingData} apAgingData={apAgingData} arTotals={arAging?.totals ?? null} apTotals={apAging?.totals ?? null} arQuery={arAgingQuery} apQuery={apAgingQuery} />
          </Suspense>
        </VxStack>

        <VxStack component="section" aria-labelledby="dashboard-analysis-title" spacing={2}>
          <VxTypography id="dashboard-analysis-title" component="h2" variant="h6">{t('dashboard.sections.analysis')}</VxTypography>
          <DashboardQuerySection label={t('dashboard.query.analysisMetrics')} query={financeQuery} minHeight={320}>
            <Suspense fallback={<DashboardSectionLoader minHeight={320} />}>
              <DashboardChartsSection t={t} cashIn={snapshot?.cashInInPeriod ?? 0} cashOut={snapshot?.cashOutInPeriod ?? 0} periodDays={periodDays} receivablesVsPayablesData={receivablesVsPayablesData} />
            </Suspense>
            <Suspense fallback={<DashboardSectionLoader minHeight={240} />}>
              <DashboardCashFlowTable t={t} periodDays={periodDays} cashRows={cashRows} />
            </Suspense>
            <Suspense fallback={<DashboardSectionLoader minHeight={140} />}>
              <DashboardQuickStatsSection t={t} quickStats={quickStats} />
            </Suspense>
          </DashboardQuerySection>
        </VxStack>
      </VxStack>

      {canViewSales ? (
        <VxStack component="section" aria-labelledby="dashboard-activity-title" spacing={2} sx={{ minWidth: 0 }}>
          <VxTypography id="dashboard-activity-title" component="h2" variant="h6">{t('dashboard.sections.activity')}</VxTypography>
          <DashboardQuerySection label={t('dashboard.query.salesOrders')} query={salesOrdersQuery} minHeight={260}>
            {canViewCustomers ? (
              <DashboardQuerySection label={t('dashboard.query.customerNames')} query={customersQuery} minHeight={80}>{null}</DashboardQuerySection>
            ) : null}
            <Suspense fallback={<DashboardSectionLoader minHeight={260} />}>
              <DashboardRecentOrdersSection t={t} recentOrders={recentOrders} />
            </Suspense>
            <Suspense fallback={<DashboardSectionLoader minHeight={260} />}>
              <DashboardTopCustomersSection t={t} topCustomers={topCustomers} />
            </Suspense>
          </DashboardQuerySection>
        </VxStack>
      ) : null}

      {canViewStorage ? (
        <Suspense fallback={<DashboardSectionLoader minHeight={240} />}>
          <DashboardStorageSection t={t} summary={storageSummary} topConsumers={storageTopConsumers} summaryQuery={storageSummaryQuery} topConsumersQuery={storageTopConsumersQuery} />
        </Suspense>
      ) : null}
    </VxStack>
  )
}
