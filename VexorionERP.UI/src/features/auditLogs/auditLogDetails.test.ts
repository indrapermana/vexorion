import { describe, expect, it } from 'vitest'
import { buildAuditLogCsv, parseSafeAuditMetadata } from './auditLogDetails'

describe('audit log detail formatting', () => {
  it('separates known before/after values and redacts sensitive metadata keys', () => {
    const details = parseSafeAuditMetadata(JSON.stringify({
      PreviousStatus: 'Draft',
      NewStatus: 'Posted',
      ProjectNumber: 'P-123',
      Email: 'person@example.test',
      AccessToken: 'secret-token',
    }))

    expect(details.before).toEqual([{ name: 'Status', value: 'Draft' }])
    expect(details.after).toEqual([{ name: 'Status', value: 'Posted' }])
    expect(details.context).toEqual([
      { name: 'ProjectNumber', value: 'P-123' },
      { name: 'Email', value: '[redacted]' },
      { name: 'AccessToken', value: '[redacted]' },
    ])
  })

  it('builds a CSV with formula-like cells neutralized', () => {
    const csv = buildAuditLogCsv([{
      id: 'audit-1',
      createdAtUtc: '2026-10-26T10:00:00Z',
      eventType: 'project.updated',
      entityName: 'Project',
      entityId: 'project-1',
      description: '=HYPERLINK("https://example.test")',
      correlationId: 'trace-1',
      metadataJson: JSON.stringify({ NewStatus: 'Active' }),
    }])

    expect(csv).toContain(`'=HYPERLINK(""https://example.test"")`)
    expect(csv).toContain('"Status=Active"')
  })
})