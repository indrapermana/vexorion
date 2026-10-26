import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuditLogsPage from './AuditLogsPage'

const api = vi.hoisted(() => ({ getAuditLogs: vi.fn() }))

vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...api }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => values ? `${key}: ${Object.values(values).join(' ')}` : key,
    i18n: { language: 'enUS' },
  }),
}))

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getAuditLogs.mockResolvedValue({
      page: 1,
      pageSize: 50,
      totalCount: 1,
      items: [{
        id: 'audit-1',
        createdAtUtc: '2026-10-26T10:00:00Z',
        eventType: 'project.status_changed',
        actorUserId: 'actor-id',
        actorUserName: 'audit-actor',
        entityName: 'Project',
        entityId: 'project-1',
        description: 'Project status changed.',
        metadataJson: JSON.stringify({ PreviousStatus: 'Draft', NewStatus: 'Active', AccessToken: 'secret-value' }),
        correlationId: 'trace-1',
      }],
    })
  })

  it('opens safe before/after details and filters by the selected trace', async () => {
    render(<AuditLogsPage />)
    expect(await screen.findByRole('button', { name: 'common.resetFilters' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'pages.auditLogs.viewDetails' }))

    expect(await screen.findByText('pages.auditLogs.detail.title')).toBeInTheDocument()
    expect(screen.getAllByText(/pages\.auditLogs\.events\.project_status_changed/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('audit-actor')).toHaveLength(2)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('pages.auditLogs.detail.redacted')).toBeInTheDocument()
    expect(screen.queryByText('secret-value')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'pages.auditLogs.filterTrace' }))

    await waitFor(() => expect(api.getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ correlationId: 'trace-1', page: 1 })))
  })
})