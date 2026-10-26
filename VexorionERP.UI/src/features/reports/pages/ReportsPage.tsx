import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxFormControlLabel, VxLink, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { getIntlLocale } from '../../../i18n/translationConstant'
import {
  ApiError,
  buildAccountDrillDownExportUrl,
  buildBalanceSheetExportUrl,
  buildProfitAndLossExportUrl,
  buildTrialBalanceExportUrl,
  downloadReportCsv,
  getAccountDrillDown,
  getApAgingReport,
  getArAgingReport,
  getBalanceSheetReport,
  getProfitAndLossReport,
  getTrialBalanceReport,
} from '../../../lib/api'
import type {
  AgingBucketTotalsResponse,
  AccountDrillDownResponse,
  ApAgingReportResponse,
  ArAgingReportResponse,
  BalanceSheetReportResponse,
  FinancialStatementLineResponse,
  ProfitAndLossReportResponse,
  TrialBalanceReportResponse,
} from '../../../types/api'
import { formatReportCurrency, formatReportDate, getAgingTotalsByCurrency } from '../reportFormatting'

function toPeriodStart(asOfDate: string) {
  const parsed = new Date(asOfDate)
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0')
  return `${parsed.getUTCFullYear()}-${month}-01`
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { currencyCode } = useCurrency()
  const locale = getIntlLocale(i18n.language)
  const formatMoney = (value: number) => formatReportCurrency(value, currencyCode, locale)
  const formatDate = (value: string) => formatReportDate(value, locale)
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
  const [isLoading, setIsLoading] = useState(false)
  const [showComparative, setShowComparative] = useState(false)
  const [arAging, setArAging] = useState<ArAgingReportResponse | null>(null)
  const [apAging, setApAging] = useState<ApAgingReportResponse | null>(null)
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReportResponse | null>(null)
  const [profitAndLoss, setProfitAndLoss] = useState<ProfitAndLossReportResponse | null>(null)
  const [priorProfitAndLoss, setPriorProfitAndLoss] = useState<ProfitAndLossReportResponse | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReportResponse | null>(null)
  const [priorBalanceSheet, setPriorBalanceSheet] = useState<BalanceSheetReportResponse | null>(null)
  const [drillDown, setDrillDown] = useState<AccountDrillDownResponse | null>(null)
  const [drillDownAccountLabel, setDrillDownAccountLabel] = useState<string | null>(null)
  const [drillDownFilter, setDrillDownFilter] = useState('')
  const [drillDownSort, setDrillDownSort] = useState<'date-desc' | 'date-asc'>('date-desc')
  const [error, setError] = useState<string | null>(null)
  const priorEndDate = previousMonthDate(asOfDate)
  const priorStartDate = toPeriodStart(priorEndDate)

  const loadReports = useCallback(async () => {
    if (!isAuthenticated) {
      setArAging(null)
      setApAging(null)
      setTrialBalance(null)
      setProfitAndLoss(null)
      setBalanceSheet(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [ar, ap, tb, pnl, bs, priorPnl, priorBs] = await Promise.all([
        getArAgingReport(asOfDate),
        getApAgingReport(asOfDate),
        getTrialBalanceReport(asOfDate),
        getProfitAndLossReport(toPeriodStart(asOfDate), asOfDate),
        showComparative ? getBalanceSheetReport(asOfDate, priorEndDate) : getBalanceSheetReport(asOfDate),
        showComparative ? getProfitAndLossReport(priorStartDate, priorEndDate) : Promise.resolve(null),
        showComparative ? getBalanceSheetReport(priorEndDate) : Promise.resolve(null),
      ])
      setArAging(ar)
      setApAging(ap)
      setTrialBalance(tb)
      setProfitAndLoss(pnl)
      setBalanceSheet(bs)
      setPriorProfitAndLoss(priorPnl)
      setPriorBalanceSheet(priorBs)
      setDrillDown(null)
      setDrillDownAccountLabel(null)
      setDrillDownFilter('')
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError(t('pages.reports.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [asOfDate, isAuthenticated, priorEndDate, priorStartDate, showComparative, t])

  const arCurrencyTotals = arAging ? getAgingTotalsByCurrency(arAging.items) : []
  const apCurrencyTotals = apAging ? getAgingTotalsByCurrency(apAging.items) : []

  const openAccountDrillDown = useCallback(async (line: FinancialStatementLineResponse) => {
    try {
      const response = await getAccountDrillDown(line.accountId, asOfDate, toPeriodStart(asOfDate))
      setDrillDown(response)
      setDrillDownAccountLabel(`${line.accountCode} - ${line.accountName}`)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError(t('pages.reports.errors.drillDown'))
    }
  }, [asOfDate, t])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.reports.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.reports')}
        description={t('pages.reports.description')}
        filters={(
          <VxStack spacing={1}>
        <VxTextField
          type="date"
          label={t('pages.reports.asOfDate')}
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        <VxFormControlLabel
          control={<VxSwitch checked={showComparative} onChange={(event) => setShowComparative(event.target.checked)} />}
          label={t('pages.reports.comparativePriorPeriod')}
        />
          </VxStack>
        )}
      />

      <PageFeedback error={error} onRetry={error ? () => void loadReports() : undefined} />

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.arAging')}</VxTypography>
        {arAging?.items.length ? (
          <VxStack spacing={0.5}>
            <VxTypography color="text.secondary">{t('pages.reports.asOfDate')}: {formatDate(arAging.asOfDate)}</VxTypography>
            {arCurrencyTotals.map(([currency, total]) => <VxTypography key={currency} color="text.secondary">{t('pages.reports.summary.totalByCurrency', { currency })}: {formatReportCurrency(total, currency, locale)}</VxTypography>)}
            <VxTypography color="text.secondary">{t('pages.reports.summary.customers')}: {arAging.items.length}</VxTypography>
            <AgingItemsTable
              rows={arAging.items.map((item) => ({ id: item.customerId, number: item.customerNumber, name: item.customerName, currencyCode: item.currencyCode, buckets: item.buckets }))}
              partyLabel={t('pages.reports.agingTable.customer')}
              formatMoney={(amount, currency) => formatReportCurrency(amount, currency, locale)}
              emptyText={t('pages.reports.empty.arAging')}
            />
          </VxStack>
        ) : isLoading ? <VxTypography color="text.secondary">{t('common.labels.loading')}</VxTypography> : <VxAlert severity="info">{t('pages.reports.empty.arAging')}</VxAlert>}
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.apAging')}</VxTypography>
        {apAging?.items.length ? (
          <VxStack spacing={0.5}>
            <VxTypography color="text.secondary">{t('pages.reports.asOfDate')}: {formatDate(apAging.asOfDate)}</VxTypography>
            {apCurrencyTotals.map(([currency, total]) => <VxTypography key={currency} color="text.secondary">{t('pages.reports.summary.totalByCurrency', { currency })}: {formatReportCurrency(total, currency, locale)}</VxTypography>)}
            <VxTypography color="text.secondary">{t('pages.reports.summary.suppliers')}: {apAging.items.length}</VxTypography>
            <AgingItemsTable
              rows={apAging.items.map((item) => ({ id: item.supplierId, number: item.supplierNumber, name: item.supplierName, currencyCode: item.currencyCode, buckets: item.buckets }))}
              partyLabel={t('pages.reports.agingTable.supplier')}
              formatMoney={(amount, currency) => formatReportCurrency(amount, currency, locale)}
              emptyText={t('pages.reports.empty.apAging')}
            />
          </VxStack>
        ) : isLoading ? <VxTypography color="text.secondary">{t('common.labels.loading')}</VxTypography> : <VxAlert severity="info">{t('pages.reports.empty.apAging')}</VxAlert>}
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.trialBalance')}</VxTypography>
        {trialBalance?.lines.length ? <>
          <VxTypography color="text.secondary">{t('pages.reports.asOfDate')}: {formatDate(trialBalance.asOfDate)}</VxTypography>
          <VxTypography color="text.secondary">{t('pages.reports.summary.totalDebit')}: {formatMoney(trialBalance.totalDebit)}</VxTypography>
          <VxTypography color="text.secondary">{t('pages.reports.summary.totalCredit')}: {formatMoney(trialBalance.totalCredit)}</VxTypography>
          <VxTypography color="text.secondary">{t('pages.reports.summary.accounts')}: {trialBalance.lines.length}</VxTypography>
        </> : !isLoading ? <VxAlert severity="info">{t('pages.reports.empty.trialBalance')}</VxAlert> : null}
        <VxButton
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => downloadReportCsv(buildTrialBalanceExportUrl(asOfDate), `trial-balance-${asOfDate}.csv`)}
        >
          {t('pages.reports.actions.exportCsv')}
        </VxButton>
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.profitAndLoss')}</VxTypography>
        {profitAndLoss ? <VxTypography color="text.secondary">{formatDate(profitAndLoss.periodStartDate)} – {formatDate(profitAndLoss.periodEndDate)}</VxTypography> : null}
        <VxTypography color="text.secondary">{t('pages.reports.summary.revenue')}: {formatMoney(profitAndLoss?.totalRevenue ?? 0)}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.expenses')}: {formatMoney(profitAndLoss?.totalExpenses ?? 0)}</VxTypography>
        <VxTypography color="text.secondary" sx={{ color: (profitAndLoss?.netIncome ?? 0) < 0 ? 'error.main' : undefined }}>{t('pages.reports.summary.netIncome')}: {formatMoney(profitAndLoss?.netIncome ?? 0)}</VxTypography>
        {showComparative && priorProfitAndLoss ? (
          <VxStack spacing={0.25} sx={{ mt: 1 }}>
            <VxTypography color="text.secondary">{t('pages.reports.summary.priorRevenue')}: {formatMoney(priorProfitAndLoss.totalRevenue)} · {t('pages.reports.summary.variance')}: {formatMoney((profitAndLoss?.totalRevenue ?? 0) - priorProfitAndLoss.totalRevenue)}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.reports.summary.priorExpenses')}: {formatMoney(priorProfitAndLoss.totalExpenses)} · {t('pages.reports.summary.variance')}: {formatMoney((profitAndLoss?.totalExpenses ?? 0) - priorProfitAndLoss.totalExpenses)}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.reports.summary.priorNetIncome')}: {formatMoney(priorProfitAndLoss.netIncome)} · {t('pages.reports.summary.netIncomeVariance')}: {formatMoney((profitAndLoss?.netIncome ?? 0) - priorProfitAndLoss.netIncome)}</VxTypography>
          </VxStack>
        ) : null}
        {profitAndLoss && !profitAndLoss.revenueLines.length && !profitAndLoss.expenseLines.length && !isLoading ? <VxAlert severity="info">{t('pages.reports.empty.profitAndLoss')}</VxAlert> : null}
        <VxButton
          variant="outlined"
          size="small"
          sx={{ mt: 2, mr: 1 }}
          onClick={() => downloadReportCsv(buildProfitAndLossExportUrl(toPeriodStart(asOfDate), asOfDate, showComparative ? priorStartDate : undefined, showComparative ? priorEndDate : undefined), `profit-and-loss-${asOfDate}.csv`)}
        >
          {t('pages.reports.actions.exportCsv')}
        </VxButton>
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.revenueLines')}</VxTypography>
        <StatementLinesTable
          lines={profitAndLoss?.revenueLines ?? []}
          priorLines={priorProfitAndLoss?.revenueLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
          formatMoney={formatMoney}
          emptyText={t('pages.reports.empty.revenueLines')}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.expenseLines')}</VxTypography>
        <StatementLinesTable
          lines={profitAndLoss?.expenseLines ?? []}
          priorLines={priorProfitAndLoss?.expenseLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
          formatMoney={formatMoney}
          emptyText={t('pages.reports.empty.expenseLines')}
        />
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.balanceSheet')}</VxTypography>
        {balanceSheet ? <VxTypography color="text.secondary">{t('pages.reports.asOfDate')}: {formatDate(balanceSheet.asOfDate)}</VxTypography> : null}
        <VxTypography color="text.secondary">{t('pages.reports.summary.assets')}: {formatMoney(balanceSheet?.totalAssets ?? 0)}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.liabilitiesEquity')}: {formatMoney(balanceSheet?.totalLiabilitiesAndEquity ?? 0)}</VxTypography>
        <VxTypography color="text.secondary" sx={{ color: (balanceSheet?.currentEarnings ?? 0) < 0 ? 'error.main' : undefined }}>{t('pages.reports.summary.currentEarnings')}: {formatMoney(balanceSheet?.currentEarnings ?? 0)}</VxTypography>
        {showComparative && priorBalanceSheet && balanceSheet ? (
          <VxStack spacing={0.25} sx={{ mt: 1 }}>
            <VxTypography color="text.secondary">{t('pages.reports.summary.priorAssets')}: {formatMoney(priorBalanceSheet.totalAssets)} · {t('pages.reports.summary.variance')}: {formatMoney(balanceSheet.totalAssets - priorBalanceSheet.totalAssets)}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.reports.summary.priorLiabilitiesEquity')}: {formatMoney(priorBalanceSheet.totalLiabilitiesAndEquity)} · {t('pages.reports.summary.variance')}: {formatMoney(balanceSheet.totalLiabilitiesAndEquity - priorBalanceSheet.totalLiabilitiesAndEquity)}</VxTypography>
          </VxStack>
        ) : null}
        {balanceSheet && !balanceSheet.assetLines.length && !balanceSheet.liabilityLines.length && !balanceSheet.equityLines.length && !isLoading ? <VxAlert severity="info">{t('pages.reports.empty.balanceSheet')}</VxAlert> : null}
        <VxButton
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => downloadReportCsv(buildBalanceSheetExportUrl(asOfDate, showComparative ? priorEndDate : undefined), `balance-sheet-${asOfDate}.csv`)}
        >
          {t('pages.reports.actions.exportCsv')}
        </VxButton>
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.assets')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.assetLines ?? []}
          priorLines={priorBalanceSheet?.assetLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
          formatMoney={formatMoney}
          emptyText={t('pages.reports.empty.assets')}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.liabilities')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.liabilityLines ?? []}
          priorLines={priorBalanceSheet?.liabilityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
          formatMoney={formatMoney}
          emptyText={t('pages.reports.empty.liabilities')}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.equity')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.equityLines ?? []}
          priorLines={priorBalanceSheet?.equityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
          formatMoney={formatMoney}
          emptyText={t('pages.reports.empty.equity')}
        />
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.accountDrillDown')}</VxTypography>
        <VxTypography color="text.secondary">{drillDownAccountLabel ?? t('pages.reports.drillDown.selectPrompt')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.entries')}: {drillDown?.lines.length ?? 0}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalDebit')}: {formatMoney(drillDown?.totalDebit ?? 0)}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalCredit')}: {formatMoney(drillDown?.totalCredit ?? 0)}</VxTypography>
        {drillDown && !drillDown.lines.length ? <VxAlert severity="info">{t('pages.reports.empty.drillDown')}</VxAlert> : null}
        <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, mb: 1 }}>
          <VxTextField
            size="small"
            label={t('pages.reports.drillDown.filter')}
            value={drillDownFilter}
            onChange={(event) => setDrillDownFilter(event.target.value)}
            placeholder={t('pages.reports.drillDown.placeholder')}
          />
          <VxTextField
            size="small"
            label={t('pages.reports.sorting.sort')}
            select
            value={drillDownSort}
            onChange={(event) => setDrillDownSort(event.target.value as 'date-desc' | 'date-asc')}
            sx={{ minWidth: 180 }}
          >
            <VxMenuItem value="date-desc">{t('pages.reports.sorting.newestFirst')}</VxMenuItem>
            <VxMenuItem value="date-asc">{t('pages.reports.sorting.oldestFirst')}</VxMenuItem>
          </VxTextField>
          <VxButton
            variant="outlined"
            size="small"
            disabled={!drillDown}
            onClick={() => {
              if (!drillDown) return
              void downloadReportCsv(
                buildAccountDrillDownExportUrl(drillDown.accountId, asOfDate, toPeriodStart(asOfDate)),
                `account-drill-down-${drillDown.accountCode}-${asOfDate}.csv`,
              )
            }}
          >
            {t('pages.reports.actions.exportDrillDownCsv')}
          </VxButton>
        </VxStack>
        <VxBox sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
          <VxTable size="small" sx={{ mt: 1 }}>
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('pages.reports.table.date')}</VxTableCell>
                <VxTableCell>{t('pages.reports.table.journal')}</VxTableCell>
                <VxTableCell>{t('pages.reports.table.description')}</VxTableCell>
                <VxTableCell align="right">{t('pages.reports.table.debit')}</VxTableCell>
                <VxTableCell align="right">{t('pages.reports.table.credit')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {getFilteredDrillDownLines(drillDown?.lines ?? [], drillDownFilter, drillDownSort).map((line) => (
                <VxTableRow key={line.journalEntryId}>
                  <VxTableCell>{formatDate(line.postingDate)}</VxTableCell>
                  <VxTableCell>{line.journalNumber}</VxTableCell>
                  <VxTableCell>{line.description}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.debitAmount)}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.creditAmount)}</VxTableCell>
                </VxTableRow>
              ))}
            </VxTableBody>
          </VxTable>
        </VxBox>
      </VxPaper>
    </VxStack>
  )
}

type AgingTableRow = {
  id: string
  number: string
  name: string
  currencyCode: string
  buckets: AgingBucketTotalsResponse
}

type AgingItemsTableProps = {
  rows: AgingTableRow[]
  partyLabel: string
  formatMoney: (amount: number, currencyCode: string) => string
  emptyText: string
}

function AgingItemsTable({ rows, partyLabel, formatMoney, emptyText }: AgingItemsTableProps) {
  const { t } = useTranslation()
  return (
    <VxTableContainer sx={{ mt: 1, maxWidth: '100%', overflowX: 'auto' }}>
      <VxTable size="small" sx={{ minWidth: 760 }}>
        <VxTableHead><VxTableRow>
          <VxTableCell>{partyLabel}</VxTableCell>
          <VxTableCell>{t('pages.reports.agingTable.currency')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.agingTable.current')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.agingTable.due1To30')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.agingTable.due31To60')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.agingTable.due61To90')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.agingTable.dueOver90')}</VxTableCell>
          <VxTableCell align="right">{t('pages.reports.summary.total')}</VxTableCell>
        </VxTableRow></VxTableHead>
        <VxTableBody>
          {rows.map((row) => (
            <VxTableRow key={row.id}>
              <VxTableCell>{row.number} · {row.name}</VxTableCell>
              <VxTableCell>{row.currencyCode}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.current, row.currencyCode)}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.due1To30, row.currencyCode)}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.due31To60, row.currencyCode)}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.due61To90, row.currencyCode)}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.dueOver90, row.currencyCode)}</VxTableCell>
              <VxTableCell align="right">{formatMoney(row.buckets.total, row.currencyCode)}</VxTableCell>
            </VxTableRow>
          ))}
          {!rows.length ? <VxTableRow><VxTableCell colSpan={8}><VxTypography color="text.secondary">{emptyText}</VxTypography></VxTableCell></VxTableRow> : null}
        </VxTableBody>
      </VxTable>
    </VxTableContainer>
  )
}

type StatementLinesTableProps = {
  lines: FinancialStatementLineResponse[]
  priorLines: FinancialStatementLineResponse[]
  showComparative: boolean
  onLineSelect: (line: FinancialStatementLineResponse) => Promise<void>
  formatMoney: (value: number) => string
  emptyText: string
}

function StatementLinesTable({ lines, priorLines, showComparative, onLineSelect, formatMoney, emptyText }: StatementLinesTableProps) {
  const { t } = useTranslation()
  const [filterText, setFilterText] = useState('')
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'amount' | 'variance'>('code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const priorByCode = new Map(priorLines.map((x) => [x.accountCode, x]))
  const normalizedFilter = filterText.trim().toLowerCase()

  const filteredLines = lines.filter((line) =>
    !normalizedFilter
      || line.accountCode.toLowerCase().includes(normalizedFilter)
      || line.accountName.toLowerCase().includes(normalizedFilter),
  )

  const sortedLines = [...filteredLines].sort((a, b) => {
    const priorAmountA = priorByCode.get(a.accountCode)?.amount ?? 0
    const priorAmountB = priorByCode.get(b.accountCode)?.amount ?? 0
    const varianceA = a.amount - priorAmountA
    const varianceB = b.amount - priorAmountB

    const compareValue = (() => {
      if (sortBy === 'code') return a.accountCode.localeCompare(b.accountCode)
      if (sortBy === 'name') return a.accountName.localeCompare(b.accountName)
      if (sortBy === 'amount') return a.amount - b.amount
      return varianceA - varianceB
    })()

    return sortDirection === 'asc' ? compareValue : -compareValue
  })

  return (
    <>
      <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <VxTextField
          size="small"
          label={t('pages.reports.table.filter')}
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder={t('pages.reports.table.accountCodeOrName')}
        />
        <VxTextField
          size="small"
          label={t('pages.reports.table.sortBy')}
          select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'code' | 'name' | 'amount' | 'variance')}
          sx={{ minWidth: 170 }}
        >
          <VxMenuItem value="code">{t('pages.reports.table.code')}</VxMenuItem>
          <VxMenuItem value="name">{t('pages.reports.table.name')}</VxMenuItem>
          <VxMenuItem value="amount">{t('pages.reports.table.amount')}</VxMenuItem>
          <VxMenuItem value="variance">{t('pages.reports.table.variance')}</VxMenuItem>
        </VxTextField>
        <VxTextField
          size="small"
          label={t('pages.reports.table.direction')}
          select
          value={sortDirection}
          onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
          sx={{ minWidth: 140 }}
        >
          <VxMenuItem value="asc">{t('pages.reports.table.ascending')}</VxMenuItem>
          <VxMenuItem value="desc">{t('pages.reports.table.descending')}</VxMenuItem>
        </VxTextField>
      </VxStack>
      <VxBox sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('pages.reports.table.account')}</VxTableCell>
              <VxTableCell align="right">{t('pages.reports.table.current')}</VxTableCell>
              {showComparative ? <VxTableCell align="right">{t('pages.reports.table.prior')}</VxTableCell> : null}
              {showComparative ? <VxTableCell align="right">{t('pages.reports.table.variance')}</VxTableCell> : null}
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {sortedLines.map((line) => {
              const priorAmount = priorByCode.get(line.accountCode)?.amount ?? 0
              return (
                <VxTableRow key={line.accountId}>
                  <VxTableCell>
                    <VxLink component="button" underline="hover" onClick={() => void onLineSelect(line)}>
                      {line.accountCode} - {line.accountName}
                    </VxLink>
                  </VxTableCell>
                  <VxTableCell align="right" sx={{ color: line.amount < 0 ? 'error.main' : undefined }}>{formatMoney(line.amount)}</VxTableCell>
                  {showComparative ? <VxTableCell align="right">{formatMoney(priorAmount)}</VxTableCell> : null}
                  {showComparative ? <VxTableCell align="right" sx={{ color: line.amount - priorAmount < 0 ? 'error.main' : undefined }}>{formatMoney(line.amount - priorAmount)}</VxTableCell> : null}
                </VxTableRow>
              )
            })}
            {!sortedLines.length ? <VxTableRow><VxTableCell colSpan={showComparative ? 4 : 2}><VxTypography color="text.secondary">{emptyText}</VxTypography></VxTableCell></VxTableRow> : null}
          </VxTableBody>
        </VxTable>
      </VxBox>
    </>
  )
}

function getFilteredDrillDownLines(
  lines: AccountDrillDownResponse['lines'],
  filterText: string,
  sortOrder: 'date-desc' | 'date-asc',
) {
  const normalizedFilter = filterText.trim().toLowerCase()

  const filtered = lines.filter((line) =>
    !normalizedFilter
      || line.journalNumber.toLowerCase().includes(normalizedFilter)
      || line.description.toLowerCase().includes(normalizedFilter),
  )

  return filtered.sort((a, b) => {
    const compareByDate = a.postingDate.localeCompare(b.postingDate)
    return sortOrder === 'date-asc' ? compareByDate : -compareByDate
  })
}

function previousMonthDate(asOfDate: string) {
  const parsed = new Date(asOfDate)
  parsed.setUTCDate(1)
  parsed.setUTCMonth(parsed.getUTCMonth() - 1)
  const year = parsed.getUTCFullYear()
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, parsed.getUTCMonth() + 1, 0)).getUTCDate()
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`
}
