import type {
  ApAgingReportResponse,
  ArAgingReportResponse,
  FinanceDashboardSnapshotResponse,
  TrialBalanceReportResponse,
} from '../../types/api'
import { requestJson } from './core'

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
