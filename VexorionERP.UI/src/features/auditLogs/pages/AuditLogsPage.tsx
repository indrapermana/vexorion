import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxMenuItem, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
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
      const response = await getAuditLogs({ eventType, entityName, page: 1, pageSize })
      setItems(response.items)
      setTotalCount(response.totalCount)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load audit logs.')
    }
  }, [entityName, eventType, isAuthenticated, pageSize])

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
          <VxTextField size="small" label={t('pages.auditLogs.eventType')} value={eventType} onChange={(event) => setEventType(event.target.value)} />
          <VxTextField size="small" label={t('pages.auditLogs.entity')} value={entityName} onChange={(event) => setEntityName(event.target.value)} />
          <VxTextField
            size="small"
            label={t('pages.auditLogs.pageSize')}
            select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            sx={{ minWidth: 140 }}
          >
            <VxMenuItem value={20}>20</VxMenuItem>
            <VxMenuItem value={50}>50</VxMenuItem>
            <VxMenuItem value={100}>100</VxMenuItem>
          </VxTextField>
          <VxButton variant="outlined" onClick={() => void loadLogs()}>{t('pages.auditLogs.refresh')}</VxButton>
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
              <VxTableCell>Created UTC</VxTableCell>
              <VxTableCell>Event</VxTableCell>
              <VxTableCell>Entity</VxTableCell>
              <VxTableCell>Description</VxTableCell>
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
      </PageBody>
    </VxStack>
  )
}
