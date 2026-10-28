import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../i18n/translationConstant'
import { ApiError, getAuditLogs } from '../lib/api'
import type { AuditLogListItemResponse } from '../types/api'

type DocumentAuditPanelProps = {
  entityName: string
  entityId: string | null
  canView: boolean
}

export default function DocumentAuditPanel({ entityName, entityId, canView }: DocumentAuditPanelProps) {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<AuditLogListItemResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadAudit = useCallback(async () => {
    if (!canView || !entityId) {
      setItems((currentItems) => currentItems.length > 0 ? [] : currentItems)
      return
    }

    setError(null)
    try {
      const result = await getAuditLogs({ entityName, entityId, page: 1, pageSize: 10 })
      setItems(result.items)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('orderWorkflow.review.auditLoadError'))
    }
  }, [canView, entityId, entityName, t])

  useEffect(() => {
    void loadAudit()
  }, [loadAudit])

  if (!canView || !entityId) return null

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack spacing={1.5}>
        <VxTypography component="h2" variant="h6">{t('orderWorkflow.review.auditTitle')}</VxTypography>
        {error ? <VxAlert severity="error">{error}</VxAlert> : null}
        {!error && items.length === 0 ? <VxTypography color="text.secondary">{t('orderWorkflow.review.noAudit')}</VxTypography> : null}
        {items.length > 0 ? (
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('orderWorkflow.review.auditDate')}</VxTableCell>
                <VxTableCell>{t('orderWorkflow.review.auditEvent')}</VxTableCell>
                <VxTableCell>{t('orderWorkflow.review.auditDescription')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {items.map((item) => (
                <VxTableRow key={item.id}>
                  <VxTableCell>{new Date(item.createdAtUtc).toLocaleString(getIntlLocale(i18n.resolvedLanguage))}</VxTableCell>
                  <VxTableCell>{item.eventType}</VxTableCell>
                  <VxTableCell>{item.description ?? '-'}</VxTableCell>
                </VxTableRow>
              ))}
            </VxTableBody>
          </VxTable>
        ) : null}
      </VxStack>
    </VxPaper>
  )
}
