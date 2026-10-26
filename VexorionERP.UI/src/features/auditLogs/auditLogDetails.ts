import type { AuditLogListItemResponse } from '../../types/api'

export type AuditMetadataEntry = { name: string; value: string }
export type SafeAuditMetadata = { before: AuditMetadataEntry[]; after: AuditMetadataEntry[]; context: AuditMetadataEntry[] }

const sensitiveMetadataKey = /(password|token|secret|credential|authorization|email|phone|ip.?address|user.?agent|reset.?key)/i

export function parseSafeAuditMetadata(metadataJson?: string | null, redactedLabel = '[redacted]'): SafeAuditMetadata {
  if (!metadataJson) return { before: [], after: [], context: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(metadataJson)
  } catch {
    return { before: [], after: [], context: [] }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { before: [], after: [], context: [] }

  const result: SafeAuditMetadata = { before: [], after: [], context: [] }
  for (const [key, value] of Object.entries(parsed)) {
    const normalizedKey = key.toLowerCase()
    const entry = {
      name: key.replace(/^(previous|before|new|after)/i, '') || key,
      value: formatSafeValue(value, key, redactedLabel),
    }
    if (normalizedKey.startsWith('previous') || normalizedKey.startsWith('before')) result.before.push(entry)
    else if (normalizedKey.startsWith('new') || normalizedKey.startsWith('after')) result.after.push(entry)
    else result.context.push(entry)
  }
  return result
}

function formatSafeValue(value: unknown, key: string, redactedLabel: string): string {
  if (sensitiveMetadataKey.test(key)) return redactedLabel
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map((item) => formatSafeValue(item, key, redactedLabel)).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value).map(([childKey, childValue]) => `${childKey}: ${formatSafeValue(childValue, childKey, redactedLabel)}`).join(', ')
  }
  return String(value)
}

export function buildAuditLogCsv(items: AuditLogListItemResponse[], redactedLabel = '[redacted]') {
  const rows = [
    ['Created UTC', 'Event', 'Actor', 'Target', 'Entity', 'Entity ID', 'Description', 'Correlation ID', 'Before', 'After', 'Context'],
    ...items.map((item) => {
      const metadata = parseSafeAuditMetadata(item.metadataJson, redactedLabel)
      const formatEntries = (entries: AuditMetadataEntry[]) => entries.map((entry) => `${entry.name}=${entry.value}`).join('; ')
      return [
        item.createdAtUtc,
        item.eventType,
        item.actorUserName ?? item.actorUserId ?? '',
        item.targetUserId ?? '',
        item.entityName ?? '',
        item.entityId ?? '',
        item.description ?? '',
        item.correlationId ?? '',
        formatEntries(metadata.before),
        formatEntries(metadata.after),
        formatEntries(metadata.context),
      ]
    }),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

function csvCell(value: string) {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}