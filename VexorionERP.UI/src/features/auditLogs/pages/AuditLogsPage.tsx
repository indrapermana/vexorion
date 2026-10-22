import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxMenuItem, VxPagination, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getAuditLogs } from '../../../lib/api'
import type { AuditLogListItemResponse } from '../../../types/api'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'

export default function AuditLogsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [eventType, setEventType] = useState('')
  const [entityName, setEntityName] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AuditLogListItemResponse[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setTotalCount(0)
      return
    }

    setError(null)
    try {
      const response = await getAuditLogs({ eventType, entityName, page, pageSize })
      setItems(response.items)
      setTotalCount(response.totalCount)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load audit logs.')
    }
  }, [entityName, eventType, isAuthenticated, page, pageSize])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.auditLogs.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.auditLogs')}
        description={t('pages.auditLogs.description')}
        filters={(
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <VxTextField size="small" label={t('pages.auditLogs.eventType')} value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1) }} />
          <VxTextField size="small" label={t('pages.auditLogs.entity')} value={entityName} onChange={(event) => { setEntityName(event.target.value); setPage(1) }} />
          <VxTextField
            size="small"
            label={t('pages.auditLogs.pageSize')}
            select
            value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}
            sx={{ minWidth: 140 }}
          >
            <VxMenuItem value={20}>20</VxMenuItem>
            <VxMenuItem value={50}>50</VxMenuItem>
            <VxMenuItem value={100}>100</VxMenuItem>
          </VxTextField>
          <VxButton variant="outlined" onClick={() => void loadLogs()}>{t('pages.auditLogs.refresh')}</VxButton>
          <VxButton
            variant="text"
            disabled={!eventType && !entityName && pageSize === 50}
            onClick={() => { setEventType(''); setEntityName(''); setPageSize(50); setPage(1) }}
          >
            {t('common.resetFilters')}
          </VxButton>
        </VxStack>
        )}
      />

      <PageFeedback error={error} onRetry={error ? () => void loadLogs() : undefined} />

      <PageBody>
        <VxTypography color="text.secondary" sx={{ mb: 1 }}>
          {t('pages.auditLogs.showingEntries', { shown: items.length, total: totalCount })}
        </VxTypography>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('pages.auditLogs.columns.createdUtc')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.event')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.entity')}</VxTableCell>
              <VxTableCell>{t('pages.auditLogs.columns.description')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {items.map((item) => (
              <VxTableRow key={item.id}>
                <VxTableCell>{item.createdAtUtc}</VxTableCell>
                <VxTableCell>{item.eventType}</VxTableCell>
                <VxTableCell>{item.entityName ?? '-'}</VxTableCell>
                <VxTableCell>{item.description ?? '-'}</VxTableCell>
              </VxTableRow>
            ))}
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
    </VxStack>
  )
}
