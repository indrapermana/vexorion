import { useQuery } from '@tanstack/react-query'
import { getCustomers, getFinanceDashboardSnapshot, getApAgingReport, getArAgingReport, getSalesOrders } from '../../lib/api'

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

export function useSalesOrdersQuery() {
  return useQuery({
    queryKey: ['dashboard', 'salesOrders'],
    queryFn: getSalesOrders,
    staleTime: 15_000,
  })
}

export function useCustomersQuery() {
  return useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: getCustomers,
    staleTime: 60_000,
  })
}
