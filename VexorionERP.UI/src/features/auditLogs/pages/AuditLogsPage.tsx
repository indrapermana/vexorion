import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPagination, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { getIntlLocale } from '../../../i18n/translationConstant'
import { ApiError, getAuditLogs } from '../../../lib/api'
import type { AuditLogListItemResponse } from '../../../types/api'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { buildAuditLogCsv, parseSafeAuditMetadata } from '../auditLogDetails'

function toUtcBoundary(date: string, endOfDay: boolean) {
  if (!date) return undefined
  const localDate = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00'}`)
  return localDate.toISOString()
}

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { isAuthenticated } = useAuth()
  const [eventType, setEventType] = useState('')
  const [entityName, setEntityName] = useState('')
  const [correlationId, setCorrelationId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AuditLogListItemResponse[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<AuditLogListItemResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadLogs = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setTotalCount(0)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await getAuditLogs({
        eventType,
        entityName,
        correlationId,
        fromUtc: toUtcBoundary(fromDate, false),
        toUtc: toUtcBoundary(toDate, true),
        page,
        pageSize,
      })
      setItems(response.items)
      setTotalCount(response.totalCount)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load audit logs.')
    } finally {
      setIsLoading(false)
    }
  }, [correlationId, entityName, eventType, fromDate, isAuthenticated, page, pageSize, toDate])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.auditLogs.signInRequired')}</VxAlert>
  }

  const formatTimestamp = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const formatEventType = (eventType: string) => {
    const fallback = eventType.split(/[._]/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
    return t(`pages.auditLogs.events.${eventType.replaceAll('.', '_')}`, { defaultValue: fallback })
  }
  const selectedMetadata = selectedItem ? parseSafeAuditMetadata(selectedItem.metadataJson, t('pages.auditLogs.detail.redacted')) : null

  const exportCurrentPage = () => {
    const blob = new Blob([buildAuditLogCsv(items, t('pages.auditLogs.detail.redacted'))], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `audit-logs-page-${page}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const filterByTrace = (traceId: string) => {
    setCorrelationId(traceId)
    setPage(1)
    setSelectedItem(null)
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.auditLogs')}
        description={t('pages.auditLogs.description')}
        filters={(
        <VxStack spacing={1.5} sx={{ minWidth: 0 }}>
          <VxBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1.25, alignItems: 'start' }}>
            <VxTextField size="small" fullWidth label={t('pages.auditLogs.eventType')} value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1) }} />
            <VxTextField size="small" fullWidth label={t('pages.auditLogs.entity')} value={entityName} onChange={(event) => { setEntityName(event.target.value); setPage(1) }} />
            <VxTextField size="small" fullWidth label={t('pages.auditLogs.correlationId')} value={correlationId} onChange={(event) => { setCorrelationId(event.target.value); setPage(1) }} />
            <VxTextField size="small" fullWidth type="date" label={t('pages.auditLogs.fromDate')} value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} slotProps={{ inputLabel: { shrink: true } }} />
            <VxTextField size="small" fullWidth type="date" label={t('pages.auditLogs.toDate')} value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} slotProps={{ inputLabel: { shrink: true } }} />
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <VxTextField
              size="small"
              label={t('pages.auditLogs.pageSize')}
              select
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}
              sx={{ width: { xs: '100%', sm: 140 } }}
            >
              <VxMenuItem value={20}>20</VxMenuItem>
              <VxMenuItem value={50}>50</VxMenuItem>
              <VxMenuItem value={100}>100</VxMenuItem>
            </VxTextField>
            <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <VxButton variant="outlined" onClick={() => void loadLogs()}>{t('pages.auditLogs.refresh')}</VxButton>
              <VxButton
                variant="text"
                disabled={!eventType && !entityName && !correlationId && !fromDate && !toDate && pageSize === 50}
                onClick={() => { setEventType(''); setEntityName(''); setCorrelationId(''); setFromDate(''); setToDate(''); setPageSize(50); setPage(1) }}
              >
                {t('common.resetFilters')}
              </VxButton>
              <VxButton variant="outlined" disabled={!items.length} onClick={exportCurrentPage}>{t('pages.auditLogs.exportPage')}</VxButton>
            </VxStack>
          </VxStack>
        </VxStack>
        )}
      />

      <PageFeedback error={error} onRetry={error ? () => void loadLogs() : undefined} />

      <PageBody>
        <VxTypography color="text.secondary" sx={{ mb: 1 }}>{t('pages.auditLogs.showingEntries', { shown: items.length, total: totalCount })}</VxTypography>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('pages.auditLogs.columns.createdUtc')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.event')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.actor')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.entity')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.description')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.trace')}</VxTableCell>
              <VxTableCell align="right">{t('common.actions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {items.map((item) => (
              <VxTableRow key={item.id}>
                <VxTableCell>{formatTimestamp(item.createdAtUtc)}</VxTableCell>
                <VxTableCell>{formatEventType(item.eventType)}</VxTableCell>
                <VxTableCell>{item.actorUserName ?? item.actorUserId ?? t('pages.auditLogs.notAvailable')}</VxTableCell>
                <VxTableCell>{item.entityName ? `${item.entityName}${item.entityId ? ` · ${item.entityId}` : ''}` : t('pages.auditLogs.notAvailable')}</VxTableCell>
                <VxTableCell>{item.description ?? '-'}</VxTableCell>
                <VxTableCell>
                  {item.correlationId ? <VxButton size="small" variant="text" onClick={() => filterByTrace(item.correlationId!)}>{item.correlationId}</VxButton> : t('pages.auditLogs.notAvailable')}
                </VxTableCell>
                <VxTableCell align="right"><VxButton size="small" onClick={() => setSelectedItem(item)}>{t('pages.auditLogs.viewDetails')}</VxButton></VxTableCell>
              </VxTableRow>
            ))}
            {!isLoading && !items.length ? <VxTableRow><VxTableCell colSpan={7}><VxTypography color="text.secondary">{t('pages.auditLogs.empty')}</VxTypography></VxTableCell></VxTableRow> : null}
          </VxTableBody>
        </VxTable>
        {totalCount > pageSize ? (
          <VxStack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <VxPagination
              page={page}
              count={Math.max(1, Math.ceil(totalCount / pageSize))}
              onChange={(_, nextPage) => setPage(nextPage)}
              size="small"
              color="primary"
            />
          </VxStack>
        ) : null}
      </PageBody>

      <VxDialog open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} fullWidth maxWidth="md">
        <VxDialogTitle>{t('pages.auditLogs.detail.title')}</VxDialogTitle>
        <VxDialogContent dividers>
          {selectedItem && selectedMetadata ? (
            <VxStack spacing={2}>
              <VxTypography><strong>{t('pages.auditLogs.columns.createdUtc')}:</strong> {formatTimestamp(selectedItem.createdAtUtc)}</VxTypography>
              <VxTypography><strong>{t('pages.auditLogs.columns.event')}:</strong> {formatEventType(selectedItem.eventType)}</VxTypography>
              <VxTypography><strong>{t('pages.auditLogs.columns.actor')}:</strong> {selectedItem.actorUserName ?? selectedItem.actorUserId ?? t('pages.auditLogs.notAvailable')}</VxTypography>
              {selectedItem.targetUserId ? <VxTypography><strong>{t('pages.auditLogs.detail.targetUser')}:</strong> {selectedItem.targetUserId}</VxTypography> : null}
              <VxTypography><strong>{t('pages.auditLogs.columns.entity')}:</strong> {selectedItem.entityName ?? t('pages.auditLogs.notAvailable')} · {selectedItem.entityId ?? t('pages.auditLogs.notAvailable')}</VxTypography>
              <VxTypography><strong>{t('pages.auditLogs.columns.description')}:</strong> {selectedItem.description ?? t('pages.auditLogs.notAvailable')}</VxTypography>
              <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                <VxTypography><strong>{t('pages.auditLogs.columns.trace')}:</strong> {selectedItem.correlationId ?? t('pages.auditLogs.notAvailable')}</VxTypography>
                {selectedItem.correlationId ? <VxButton size="small" onClick={() => filterByTrace(selectedItem.correlationId!)}>{t('pages.auditLogs.filterTrace')}</VxButton> : null}
              </VxStack>
              {selectedMetadata.before.length || selectedMetadata.after.length ? (
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <MetadataSection title={t('pages.auditLogs.detail.before')} entries={selectedMetadata.before} emptyText={t('pages.auditLogs.detail.noSafeSnapshot')} />
                  <MetadataSection title={t('pages.auditLogs.detail.after')} entries={selectedMetadata.after} emptyText={t('pages.auditLogs.detail.noSafeSnapshot')} />
                </VxStack>
              ) : <VxAlert severity="info">{t('pages.auditLogs.detail.noSafeSnapshot')}</VxAlert>}
              <MetadataSection title={t('pages.auditLogs.detail.context')} entries={selectedMetadata.context} emptyText={t('pages.auditLogs.detail.noContext')} />
            </VxStack>
          ) : null}
        </VxDialogContent>
        <VxDialogActions><VxButton onClick={() => setSelectedItem(null)}>{t('common.close')}</VxButton></VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}

function MetadataSection({ title, entries, emptyText }: { title: string; entries: Array<{ name: string; value: string }>; emptyText: string }) {
  const { t } = useTranslation()
  return (
    <VxStack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
      <VxTypography component="h3" variant="subtitle2">{title}</VxTypography>
      {entries.length ? entries.map((entry) => (
        <VxTypography key={entry.name} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          <strong>{entry.name}:</strong> {entry.value || t('pages.auditLogs.notAvailable')}
        </VxTypography>
      )) : <VxTypography variant="body2" color="text.secondary">{emptyText}</VxTypography>}
    </VxStack>
  )
}
