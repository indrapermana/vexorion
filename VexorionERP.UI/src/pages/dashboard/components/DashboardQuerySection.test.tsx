import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardQuerySection, { type DashboardQueryState } from './DashboardQuerySection'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { section?: string }) => `${key}${options?.section ? `: ${options.section}` : ''}`, i18n: { resolvedLanguage: 'enUS' } }),
}))

const query: DashboardQueryState = {
  data: { total: 12 }, isPending: false, isFetching: false, isError: false,
  dataUpdatedAt: Date.parse('2026-10-24T09:00:00Z'), refetch: vi.fn().mockResolvedValue({}),
}

describe('Dashboard query states', () => {
  it('does not render zero-valued content or a success timestamp after a failed first load', () => {
    render(<DashboardQuerySection label="Finance" query={{ ...query, data: undefined, isError: true, dataUpdatedAt: 0 }}><p>Zero cash</p></DashboardQuerySection>)
    expect(screen.getByRole('alert')).toHaveTextContent('dashboard.query.failed: Finance')
    expect(screen.queryByText('Zero cash')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.query.lastUpdated')).not.toBeInTheDocument()
  })

  it('announces the pending section without rendering its content', () => {
    render(<DashboardQuerySection label="Aging" query={{ ...query, data: undefined, isPending: true, isFetching: true, dataUpdatedAt: 0 }}><p>Aging data</p></DashboardQuerySection>)
    expect(screen.getByRole('status', { name: 'dashboard.query.loading: Aging' })).toBeInTheDocument()
    expect(screen.queryByText('Aging data')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('retries only its own query', () => {
    const refetch = vi.fn().mockResolvedValue({})
    render(<DashboardQuerySection label="Storage" query={{ ...query, data: undefined, isError: true, refetch }}><p>Storage data</p></DashboardQuerySection>)
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.query.retry: Storage' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('retains cached data and its successful timestamp when refresh fails', () => {
    render(<DashboardQuerySection label="Sales" query={{ ...query, isError: true }}><p>Cached orders</p></DashboardQuerySection>)
    expect(screen.getByText('Cached orders')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('dashboard.query.stale: Sales')
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-10-24T09:00:00.000Z')
  })

  it('retains cached data and disables duplicate refreshes while updating', () => {
    render(<DashboardQuerySection label="Sales" query={{ ...query, isFetching: true }}><p>Cached orders</p></DashboardQuerySection>)
    expect(screen.getByText('Cached orders')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('dashboard.query.updating: Sales')
    expect(screen.getByRole('button', { name: 'dashboard.query.refresh: Sales' })).toBeDisabled()
  })

  it('advances freshness only when a successful refresh supplies a newer timestamp', () => {
    const { rerender } = render(<DashboardQuerySection label="Sales" query={query}><p>Orders</p></DashboardQuerySection>)
    rerender(<DashboardQuerySection label="Sales" query={{ ...query, isError: true }}><p>Orders</p></DashboardQuerySection>)
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-10-24T09:00:00.000Z')
    rerender(<DashboardQuerySection label="Sales" query={{ ...query, dataUpdatedAt: Date.parse('2026-10-24T10:00:00Z') }}><p>Orders</p></DashboardQuerySection>)
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-10-24T10:00:00.000Z')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})