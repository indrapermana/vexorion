import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FiscalPeriodsPage from './FiscalPeriodsPage'

const api = vi.hoisted(() => ({ getFiscalPeriods: vi.fn() }))
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { permissions: ['billing.view'] } }) }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'enUS' } }) }))
vi.mock('../components/FiscalPeriodDataGrid', () => ({ default: () => <div>Fiscal period list</div> }))
vi.mock('../components/FiscalPeriodEditorDialog', () => ({ default: () => null }))

describe('FiscalPeriodsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getFiscalPeriods.mockResolvedValue([
      { id: 'period-1', periodCode: 'FY-ALL', startDate: '2020-01-01', endDate: '2030-12-31', isClosed: false },
    ])
  })

  it('switches from the existing list to a calendar period-status view', async () => {
    render(<FiscalPeriodsPage />)
    expect(await screen.findByText('Fiscal period list')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'pages.fiscalPeriods.views.calendar' }))

    await waitFor(() => expect(screen.getAllByText('FY-ALL · common.labels.open').length).toBeGreaterThan(0))
    expect(screen.getByRole('grid', { name: 'pages.fiscalPeriods.calendar.title' })).toBeInTheDocument()
  })
})