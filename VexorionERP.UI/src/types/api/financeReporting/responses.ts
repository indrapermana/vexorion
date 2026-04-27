export type AgingBucketTotalsResponse = {
  current: number
  due1To30: number
  due31To60: number
  due61To90: number
  dueOver90: number
  total: number
}

export type ArAgingItemResponse = {
  customerId: string
  customerNumber: string
  customerName: string
  currencyCode: string
  buckets: AgingBucketTotalsResponse
}

export type ApAgingItemResponse = {
  supplierId: string
  supplierNumber: string
  supplierName: string
  currencyCode: string
  buckets: AgingBucketTotalsResponse
}

export type ArAgingReportResponse = {
  asOfDate: string
  totals: AgingBucketTotalsResponse
  items: ArAgingItemResponse[]
}

export type ApAgingReportResponse = {
  asOfDate: string
  totals: AgingBucketTotalsResponse
  items: ApAgingItemResponse[]
}

export type TrialBalanceLineResponse = {
  accountId: string
  accountCode: string
  accountName: string
  totalDebit: number
  totalCredit: number
  endingDebit: number
  endingCredit: number
}

export type TrialBalanceReportResponse = {
  asOfDate: string
  totalDebit: number
  totalCredit: number
  endingDebitTotal: number
  endingCreditTotal: number
  lines: TrialBalanceLineResponse[]
}

export type FinanceDashboardSnapshotResponse = {
  asOfDate: string
  periodStartDate: string
  periodDays: number
  receivablesOpen: number
  receivablesOverdue: number
  payablesOpen: number
  payablesOverdue: number
  revenueInPeriod: number
  cashInInPeriod: number
  cashOutInPeriod: number
  netCashInPeriod: number
}

export type FinancialStatementLineResponse = {
  accountId: string
  accountCode: string
  accountName: string
  amount: number
}

export type ProfitAndLossReportResponse = {
  periodStartDate: string
  periodEndDate: string
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  revenueLines: FinancialStatementLineResponse[]
  expenseLines: FinancialStatementLineResponse[]
  priorPeriod?: PriorPeriodSummaryResponse
}

export type PriorPeriodSummaryResponse = {
  periodStartDate: string
  periodEndDate: string
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

export type BalanceSheetReportResponse = {
  asOfDate: string
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  currentEarnings: number
  totalLiabilitiesAndEquity: number
  assetLines: FinancialStatementLineResponse[]
  liabilityLines: FinancialStatementLineResponse[]
  equityLines: FinancialStatementLineResponse[]
  priorPeriod?: PriorBalanceSheetSummaryResponse
}

export type PriorBalanceSheetSummaryResponse = {
  asOfDate: string
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  currentEarnings: number
  totalLiabilitiesAndEquity: number
}

export type JournalLineDetailResponse = {
  journalEntryId: string
  journalNumber: string
  postingDate: string
  description: string
  debitAmount: number
  creditAmount: number
}

export type AccountDrillDownResponse = {
  accountId: string
  accountCode: string
  accountName: string
  periodStartDate?: string
  periodEndDate: string
  totalDebit: number
  totalCredit: number
  lines: JournalLineDetailResponse[]
}
