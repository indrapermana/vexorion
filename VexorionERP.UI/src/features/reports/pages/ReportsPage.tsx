import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
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
      else setError('Unable to load reporting data.')
    }
  }, [asOfDate, isAuthenticated, showComparative])

  const openAccountDrillDown = useCallback(async (line: FinancialStatementLineResponse) => {
    try {
      const response = await getAccountDrillDown(line.accountId, asOfDate, toPeriodStart(asOfDate))
      setDrillDown(response)
      setDrillDownAccountLabel(`${line.accountCode} - ${line.accountName}`)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load account drill-down.')
    }
  }, [asOfDate])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  if (!isAuthenticated) {
    return <Alert severity="info">{t('pages.reports.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.reports')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{t('pages.reports.description')}</Typography>
        <TextField
          type="date"
          label={t('pages.reports.asOfDate')}
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        <FormControlLabel
          control={<Switch checked={showComparative} onChange={(event) => setShowComparative(event.target.checked)} />}
          label={t('pages.reports.comparativePriorPeriod')}
        />
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>A/R Aging Summary</Typography>
        <Typography color="text.secondary">Total: {arAging ? arAging.totals.total.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Customers: {arAging ? arAging.items.length : 0}</Typography>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>A/P Aging Summary</Typography>
        <Typography color="text.secondary">Total: {apAging ? apAging.totals.total.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Suppliers: {apAging ? apAging.items.length : 0}</Typography>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Trial Balance Summary</Typography>
        <Typography color="text.secondary">Total Debit: {trialBalance ? trialBalance.totalDebit.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Total Credit: {trialBalance ? trialBalance.totalCredit.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Accounts: {trialBalance ? trialBalance.lines.length : 0}</Typography>
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => downloadReportCsv(buildTrialBalanceExportUrl(asOfDate), `trial-balance-${asOfDate}.csv`)}
        >
          Export CSV
        </Button>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Profit &amp; Loss (MTD)</Typography>
        <Typography color="text.secondary">Revenue: {profitAndLoss ? profitAndLoss.totalRevenue.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Expenses: {profitAndLoss ? profitAndLoss.totalExpenses.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Net Income: {profitAndLoss ? profitAndLoss.netIncome.toFixed(2) : '0.00'}</Typography>
        {showComparative && priorProfitAndLoss ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Prior Net Income: {priorProfitAndLoss.netIncome.toFixed(2)}
          </Typography>
        ) : null}
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2, mr: 1 }}
          onClick={() => downloadReportCsv(buildProfitAndLossExportUrl(toPeriodStart(asOfDate), asOfDate), `profit-and-loss-${asOfDate}.csv`)}
        >
          Export CSV
        </Button>
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Revenue Lines</Typography>
        <StatementLinesTable
          lines={profitAndLoss?.revenueLines ?? []}
          priorLines={priorProfitAndLoss?.revenueLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Expense Lines</Typography>
        <StatementLinesTable
          lines={profitAndLoss?.expenseLines ?? []}
          priorLines={priorProfitAndLoss?.expenseLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Balance Sheet Summary</Typography>
        <Typography color="text.secondary">Assets: {balanceSheet ? balanceSheet.totalAssets.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Liabilities + Equity: {balanceSheet ? balanceSheet.totalLiabilitiesAndEquity.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Current Earnings: {balanceSheet ? balanceSheet.currentEarnings.toFixed(2) : '0.00'}</Typography>
        {showComparative && priorBalanceSheet && balanceSheet ? (
          <>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Prior Assets: {priorBalanceSheet.totalAssets.toFixed(2)}
            </Typography>
            <Typography color="text.secondary">
              Asset Variance: {(balanceSheet.totalAssets - priorBalanceSheet.totalAssets).toFixed(2)}
            </Typography>
          </>
        ) : null}
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => downloadReportCsv(buildBalanceSheetExportUrl(asOfDate), `balance-sheet-${asOfDate}.csv`)}
        >
          Export CSV
        </Button>
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Assets</Typography>
        <StatementLinesTable
          lines={balanceSheet?.assetLines ?? []}
          priorLines={priorBalanceSheet?.assetLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Liabilities</Typography>
        <StatementLinesTable
          lines={balanceSheet?.liabilityLines ?? []}
          priorLines={priorBalanceSheet?.liabilityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
        <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Equity</Typography>
        <StatementLinesTable
          lines={balanceSheet?.equityLines ?? []}
          priorLines={priorBalanceSheet?.equityLines ?? []}
          showComparative={showComparative}
          onLineSelect={openAccountDrillDown}
        />
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Account Drill-down</Typography>
        <Typography color="text.secondary">{drillDownAccountLabel ?? 'Select a P&L line to view journal provenance.'}</Typography>
        <Typography color="text.secondary">Entries: {drillDown?.lines.length ?? 0}</Typography>
        <Typography color="text.secondary">Total Debit: {drillDown ? drillDown.totalDebit.toFixed(2) : '0.00'}</Typography>
        <Typography color="text.secondary">Total Credit: {drillDown ? drillDown.totalCredit.toFixed(2) : '0.00'}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, mb: 1 }}>
          <TextField
            size="small"
            label="Filter drill-down"
            value={drillDownFilter}
            onChange={(event) => setDrillDownFilter(event.target.value)}
            placeholder="Journal no / description"
          />
          <TextField
            size="small"
            label="Sort"
            select
            value={drillDownSort}
            onChange={(event) => setDrillDownSort(event.target.value as 'date-desc' | 'date-asc')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="date-desc">Newest first</MenuItem>
            <MenuItem value="date-asc">Oldest first</MenuItem>
          </TextField>
          <Button
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
            Export Drill-down CSV
          </Button>
        </Stack>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Journal</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredDrillDownLines(drillDown?.lines ?? [], drillDownFilter, drillDownSort).map((line) => (
              <TableRow key={line.journalEntryId}>
                <TableCell>{line.postingDate}</TableCell>
                <TableCell>{line.journalNumber}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell align="right">{line.debitAmount.toFixed(2)}</TableCell>
                <TableCell align="right">{line.creditAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}

type StatementLinesTableProps = {
  lines: FinancialStatementLineResponse[]
  priorLines: FinancialStatementLineResponse[]
  showComparative: boolean
  onLineSelect: (line: FinancialStatementLineResponse) => Promise<void>
}

function StatementLinesTable({ lines, priorLines, showComparative, onLineSelect }: StatementLinesTableProps) {
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          label="Filter"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Account code or name"
        />
        <TextField
          size="small"
          label="Sort by"
          select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'code' | 'name' | 'amount' | 'variance')}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="code">Code</MenuItem>
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="amount">Amount</MenuItem>
          <MenuItem value="variance">Variance</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Direction"
          select
          value={sortDirection}
          onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </TextField>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Account</TableCell>
            <TableCell align="right">Current</TableCell>
            {showComparative ? <TableCell align="right">Prior</TableCell> : null}
            {showComparative ? <TableCell align="right">Variance</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedLines.map((line) => {
            const priorAmount = priorByCode.get(line.accountCode)?.amount ?? 0
            return (
              <TableRow key={line.accountId}>
                <TableCell>
                  <Link component="button" underline="hover" onClick={() => void onLineSelect(line)}>
                    {line.accountCode} - {line.accountName}
                  </Link>
                </TableCell>
                <TableCell align="right">{line.amount.toFixed(2)}</TableCell>
                {showComparative ? <TableCell align="right">{priorAmount.toFixed(2)}</TableCell> : null}
                {showComparative ? <TableCell align="right">{(line.amount - priorAmount).toFixed(2)}</TableCell> : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
