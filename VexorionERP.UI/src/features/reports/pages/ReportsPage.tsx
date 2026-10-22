import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxFormControlLabel, VxLink, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'
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
  AccountDrillDownResponse,
  ApAgingReportResponse,
  ArAgingReportResponse,
  BalanceSheetReportResponse,
  FinancialStatementLineResponse,
  ProfitAndLossReportResponse,
  TrialBalanceReportResponse,
} from '../../../types/api'

function toPeriodStart(asOfDate: string) {
  const parsed = new Date(asOfDate)
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0')
  return `${parsed.getUTCFullYear()}-${month}-01`
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))
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

  const loadReports = useCallback(async () => {
    if (!isAuthenticated) {
      setArAging(null)
      setApAging(null)
      setTrialBalance(null)
      setProfitAndLoss(null)
      setBalanceSheet(null)
      return
    }

    setError(null)
    try {
      const priorEndDate = previousMonthDate(asOfDate)
      const priorStartDate = toPeriodStart(priorEndDate)
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
    }
  }, [asOfDate, isAuthenticated, showComparative, t])

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
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.arAging')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.total')}: {arAging ? arAging.totals.total.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.customers')}: {arAging ? arAging.items.length : 0}</VxTypography>
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.apAging')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.total')}: {apAging ? apAging.totals.total.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.suppliers')}: {apAging ? apAging.items.length : 0}</VxTypography>
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.trialBalance')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalDebit')}: {trialBalance ? trialBalance.totalDebit.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalCredit')}: {trialBalance ? trialBalance.totalCredit.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.accounts')}: {trialBalance ? trialBalance.lines.length : 0}</VxTypography>
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
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.profitAndLoss')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.revenue')}: {profitAndLoss ? profitAndLoss.totalRevenue.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.expenses')}: {profitAndLoss ? profitAndLoss.totalExpenses.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.netIncome')}: {profitAndLoss ? profitAndLoss.netIncome.toFixed(2) : '0.00'}</VxTypography>
        {showComparative && priorProfitAndLoss ? (
          <VxTypography color="text.secondary" sx={{ mt: 1 }}>
            {t('pages.reports.summary.priorNetIncome')}: {priorProfitAndLoss.netIncome.toFixed(2)}
          </VxTypography>
        ) : null}
        <VxButton
          variant="outlined"
          size="small"
          sx={{ mt: 2, mr: 1 }}
          onClick={() => downloadReportCsv(buildProfitAndLossExportUrl(toPeriodStart(asOfDate), asOfDate), `profit-and-loss-${asOfDate}.csv`)}
        >
          {t('pages.reports.actions.exportCsv')}
        </VxButton>
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.revenueLines')}</VxTypography>
        <StatementLinesTable
          lines={profitAndLoss?.revenueLines ?? []}
          priorLines={priorProfitAndLoss?.revenueLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.expenseLines')}</VxTypography>
        <StatementLinesTable
          lines={profitAndLoss?.expenseLines ?? []}
          priorLines={priorProfitAndLoss?.expenseLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.balanceSheet')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.assets')}: {balanceSheet ? balanceSheet.totalAssets.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.liabilitiesEquity')}: {balanceSheet ? balanceSheet.totalLiabilitiesAndEquity.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.currentEarnings')}: {balanceSheet ? balanceSheet.currentEarnings.toFixed(2) : '0.00'}</VxTypography>
        {showComparative && priorBalanceSheet && balanceSheet ? (
          <>
            <VxTypography color="text.secondary" sx={{ mt: 1 }}>
              {t('pages.reports.summary.priorAssets')}: {priorBalanceSheet.totalAssets.toFixed(2)}
            </VxTypography>
            <VxTypography color="text.secondary">
              {t('pages.reports.summary.assetVariance')}: {(balanceSheet.totalAssets - priorBalanceSheet.totalAssets).toFixed(2)}
            </VxTypography>
          </>
        ) : null}
        <VxButton
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => downloadReportCsv(buildBalanceSheetExportUrl(asOfDate), `balance-sheet-${asOfDate}.csv`)}
        >
          {t('pages.reports.actions.exportCsv')}
        </VxButton>
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.assets')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.assetLines ?? []}
          priorLines={priorBalanceSheet?.assetLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.liabilities')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.liabilityLines ?? []}
          priorLines={priorBalanceSheet?.liabilityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <VxTypography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>{t('pages.reports.sections.equity')}</VxTypography>
        <StatementLinesTable
          lines={balanceSheet?.equityLines ?? []}
          priorLines={priorBalanceSheet?.equityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('pages.reports.sections.accountDrillDown')}</VxTypography>
        <VxTypography color="text.secondary">{drillDownAccountLabel ?? t('pages.reports.drillDown.selectPrompt')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.entries')}: {drillDown?.lines.length ?? 0}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalDebit')}: {drillDown ? drillDown.totalDebit.toFixed(2) : '0.00'}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.reports.summary.totalCredit')}: {drillDown ? drillDown.totalCredit.toFixed(2) : '0.00'}</VxTypography>
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
                <VxTableCell>{line.postingDate}</VxTableCell>
                <VxTableCell>{line.journalNumber}</VxTableCell>
                <VxTableCell>{line.description}</VxTableCell>
                <VxTableCell align="right">{line.debitAmount.toFixed(2)}</VxTableCell>
                <VxTableCell align="right">{line.creditAmount.toFixed(2)}</VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      </VxPaper>
    </VxStack>
  )
}

type StatementLinesTableProps = {
  lines: FinancialStatementLineResponse[]
  priorLines: FinancialStatementLineResponse[]
  showComparative: boolean
  onLineSelect: (line: FinancialStatementLineResponse) => Promise<void>
}

function StatementLinesTable({ lines, priorLines, showComparative, onLineSelect }: StatementLinesTableProps) {
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
                <VxTableCell align="right">{line.amount.toFixed(2)}</VxTableCell>
                {showComparative ? <VxTableCell align="right">{priorAmount.toFixed(2)}</VxTableCell> : null}
                {showComparative ? <VxTableCell align="right">{(line.amount - priorAmount).toFixed(2)}</VxTableCell> : null}
              </VxTableRow>
            )
          })}
        </VxTableBody>
      </VxTable>
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
