import { useQuery } from '@tanstack/react-query'
import { getCustomers, getFinanceDashboardSnapshot, getApAgingReport, getArAgingReport, getSalesOrders, getTenantStorageSummary, getTenantStorageTopConsumers } from '../../lib/api'

export function useFinanceSnapshotQuery(asOfDate: string, periodDays: number) {
  return useQuery({
    queryKey: ['dashboard', 'financeSnapshot', asOfDate, periodDays],
    queryFn: () => getFinanceDashboardSnapshot(asOfDate, periodDays),
    staleTime: 60_000,
  })
}

export function useArAgingQuery(asOfDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'arAging', asOfDate],
    queryFn: () => getArAgingReport(asOfDate),
    staleTime: 60_000,
  })
}

export function useApAgingQuery(asOfDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'apAging', asOfDate],
    queryFn: () => getApAgingReport(asOfDate),
    staleTime: 60_000,
  })
}

export function useSalesOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'salesOrders'],
    queryFn: getSalesOrders,
    staleTime: 15_000,
    enabled,
  })
}

export function useCustomersQuery(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: getCustomers,
    staleTime: 60_000,
    enabled,
  })
}

export function useTenantStorageSummaryQuery(tenantId?: string, enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'storageSummary', tenantId],
    queryFn: () => getTenantStorageSummary(tenantId!),
    staleTime: 30_000,
    enabled: Boolean(tenantId) && enabled,
  })
}

export function useTenantStorageTopConsumersQuery(tenantId?: string, take = 5, enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'storageTopConsumers', tenantId, take],
    queryFn: () => getTenantStorageTopConsumers(tenantId!, take),
    staleTime: 30_000,
    enabled: Boolean(tenantId) && enabled,
  })
}
