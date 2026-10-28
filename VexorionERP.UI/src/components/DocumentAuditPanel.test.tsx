import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DocumentAuditPanel from './DocumentAuditPanel'

const auditMocks = vi.hoisted(() => ({ getAuditLogs: vi.fn() }))
const translate = (key: string) => ({
  'orderWorkflow.review.auditTitle': 'Audit history',
  'orderWorkflow.review.auditDate': 'Date',
  'orderWorkflow.review.auditEvent': 'Event',
  'orderWorkflow.review.auditDescription': 'Description',
  'orderWorkflow.review.noAudit': 'No audit events.',
  'orderWorkflow.review.auditLoadError': 'Unable to load audit history.',
}[key] ?? key)
vi.mock('../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...auditMocks }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: 'enUS' },
    t: translate,
  }),
}))

describe('DocumentAuditPanel', () => {
  it('requests and renders audit events for the selected document only', async () => {
    auditMocks.getAuditLogs.mockResolvedValue({ items: [{ id: 'event-1', createdAtUtc: '2026-10-25T10:00:00Z', eventType: 'invoice.updated', description: 'Invoice updated.' }] })

    render(<DocumentAuditPanel entityName="SalesInvoice" entityId="invoice-1" canView />)

    expect(await screen.findByText('Invoice updated.')).toBeInTheDocument()
    expect(auditMocks.getAuditLogs).toHaveBeenCalledWith({ entityName: 'SalesInvoice', entityId: 'invoice-1', page: 1, pageSize: 10 })
  })

  it('does not query or expose audit events without permission', () => {
    auditMocks.getAuditLogs.mockClear()
    const { container } = render(<DocumentAuditPanel entityName="SalesInvoice" entityId="invoice-1" canView={false} />)

    expect(container).toBeEmptyDOMElement()
    expect(auditMocks.getAuditLogs).not.toHaveBeenCalled()
  })
})
