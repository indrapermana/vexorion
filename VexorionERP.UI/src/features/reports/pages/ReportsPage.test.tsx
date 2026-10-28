import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsPage from './ReportsPage'

const api = vi.hoisted(() => ({
  buildBalanceSheetExportUrl: vi.fn(() => '/balance-sheet.csv'),
  buildProfitAndLossExportUrl: vi.fn(() => '/profit-and-loss.csv'),
  buildTrialBalanceExportUrl: vi.fn(() => '/trial-balance.csv'),
  downloadReportCsv: vi.fn(),
  getAccountDrillDown: vi.fn(),
  getApAgingReport: vi.fn(),
  getArAgingReport: vi.fn(),
  getBalanceSheetReport: vi.fn(),
  getProfitAndLossReport: vi.fn(),
  getTrialBalanceReport: vi.fn(),
}))

vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('../../../app/CurrencyContext', () => ({ useCurrency: () => ({ currencyCode: 'USD' }) }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => values ? `${key}: ${Object.values(values).join(' ')}` : key,
    i18n: { language: 'enUS' },
  }),
}))

const emptyBuckets = { current: 0, due1To30: 0, due31To60: 0, due61To90: 0, dueOver90: 0, total: 0 }

function setEmptyReports() {
  api.getArAgingReport.mockResolvedValue({ asOfDate: '2026-10-26', totals: emptyBuckets, items: [] })
  api.getApAgingReport.mockResolvedValue({ asOfDate: '2026-10-26', totals: emptyBuckets, items: [] })
  api.getTrialBalanceReport.mockResolvedValue({ asOfDate: '2026-10-26', totalDebit: 0, totalCredit: 0, endingDebitTotal: 0, endingCreditTotal: 0, lines: [] })
  api.getProfitAndLossReport.mockResolvedValue({ periodStartDate: '2026-10-01', periodEndDate: '2026-10-26', totalRevenue: 0, totalExpenses: 0, netIncome: 0, revenueLines: [], expenseLines: [] })
  api.getBalanceSheetReport.mockResolvedValue({ asOfDate: '2026-10-26', totalAssets: 0, totalLiabilities: 0, totalEquity: 0, currentEarnings: 0, totalLiabilitiesAndEquity: 0, assetLines: [], liabilityLines: [], equityLines: [] })
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'))
    vi.clearAllMocks()
    setEmptyReports()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows aging totals separately by currency instead of adding unlike currencies', async () => {
    api.getArAgingReport.mockResolvedValue({
      asOfDate: '2026-10-26', totals: { ...emptyBuckets, total: 150100 },
      items: [
        { customerId: 'customer-us', customerNumber: 'C-US', customerName: 'US customer', currencyCode: 'USD', buckets: { ...emptyBuckets, total: 100 } },
        { customerId: 'customer-id', customerNumber: 'C-ID', customerName: 'ID customer', currencyCode: 'IDR', buckets: { ...emptyBuckets, total: 150000 } },
      ],
    })
    render(<ReportsPage />)

    expect(await screen.findByText((_, element) => element?.textContent === 'pages.reports.summary.totalByCurrency: IDR: IDR 150,000')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === 'pages.reports.summary.totalByCurrency: USD: $100.00')).toBeInTheDocument()
    expect(screen.queryByText(/150,100/)).not.toBeInTheDocument()
  })

  it('provides no-data explanations and exports prior-period comparisons', async () => {
    render(<ReportsPage />)
    expect(await screen.findByText('pages.reports.empty.arAging')).toBeInTheDocument()
    expect(screen.getByText('pages.reports.empty.apAging')).toBeInTheDocument()
    expect(screen.getByText('pages.reports.empty.trialBalance')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('pages.reports.comparativePriorPeriod'))
    await waitFor(() => expect(api.getProfitAndLossReport).toHaveBeenCalledWith('2026-09-01', '2026-09-30'))

    fireEvent.click(screen.getAllByRole('button', { name: 'pages.reports.actions.exportCsv' })[1])
    expect(api.buildProfitAndLossExportUrl).toHaveBeenCalledWith('2026-10-01', '2026-10-26', '2026-09-01', '2026-09-30')
    expect(api.downloadReportCsv).toHaveBeenCalledWith('/profit-and-loss.csv', 'profit-and-loss-2026-10-26.csv')
  })
})
