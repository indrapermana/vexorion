import type {
  AccountDrillDownResponse,
  ApAgingReportResponse,
  ArAgingReportResponse,
  BalanceSheetReportResponse,
  FinanceDashboardSnapshotResponse,
  ProfitAndLossReportResponse,
  TrialBalanceReportResponse,
} from '../../types/api'
import { apiClient, requestJson } from './core'

export function getFinanceDashboardSnapshot(asOfDate: string, periodDays = 30) {
  return requestJson<FinanceDashboardSnapshotResponse>(
    `/reports/dashboard?asOfDate=${encodeURIComponent(asOfDate)}&periodDays=${periodDays}`,
  )
}

export function getArAgingReport(asOfDate: string) {
  return requestJson<ArAgingReportResponse>(`/reports/ar-aging?asOfDate=${encodeURIComponent(asOfDate)}`)
}

export function getApAgingReport(asOfDate: string) {
  return requestJson<ApAgingReportResponse>(`/reports/ap-aging?asOfDate=${encodeURIComponent(asOfDate)}`)
}

export function getTrialBalanceReport(asOfDate: string) {
  return requestJson<TrialBalanceReportResponse>(`/reports/trial-balance?asOfDate=${encodeURIComponent(asOfDate)}`)
}

export function getProfitAndLossReport(
  startDate: string,
  endDate: string,
  priorStartDate?: string,
  priorEndDate?: string,
) {
  let url = `/reports/profit-and-loss?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
  if (priorStartDate && priorEndDate) {
    url += `&priorStartDate=${encodeURIComponent(priorStartDate)}&priorEndDate=${encodeURIComponent(priorEndDate)}`
  }
  return requestJson<ProfitAndLossReportResponse>(url)
}

export function getBalanceSheetReport(asOfDate: string, priorAsOfDate?: string) {
  let url = `/reports/balance-sheet?asOfDate=${encodeURIComponent(asOfDate)}`
  if (priorAsOfDate) url += `&priorAsOfDate=${encodeURIComponent(priorAsOfDate)}`
  return requestJson<BalanceSheetReportResponse>(url)
}

export function getAccountDrillDown(accountId: string, endDate: string, startDate?: string) {
  let url = `/reports/account-drill-down/${encodeURIComponent(accountId)}?endDate=${encodeURIComponent(endDate)}`
  if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`
  return requestJson<AccountDrillDownResponse>(url)
}

export function buildProfitAndLossExportUrl(startDate: string, endDate: string, priorStartDate?: string, priorEndDate?: string) {
  let url = `/api/reports/profit-and-loss/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
  if (priorStartDate && priorEndDate) {
    url += `&priorStartDate=${encodeURIComponent(priorStartDate)}&priorEndDate=${encodeURIComponent(priorEndDate)}`
  }
  return url
}

export function buildBalanceSheetExportUrl(asOfDate: string, priorAsOfDate?: string) {
  let url = `/api/reports/balance-sheet/export?asOfDate=${encodeURIComponent(asOfDate)}`
  if (priorAsOfDate) url += `&priorAsOfDate=${encodeURIComponent(priorAsOfDate)}`
  return url
}

export function buildTrialBalanceExportUrl(asOfDate: string) {
  return `/api/reports/trial-balance/export?asOfDate=${encodeURIComponent(asOfDate)}`
}

export function buildAccountDrillDownExportUrl(accountId: string, endDate: string, startDate?: string) {
  let url = `/api/reports/account-drill-down/${encodeURIComponent(accountId)}/export?endDate=${encodeURIComponent(endDate)}`
  if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`
  return url
}

export async function downloadReportCsv(path: string, fileName: string) {
  const response = await apiClient.get<Blob>(path, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
