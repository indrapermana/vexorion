import { RefreshIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxChip, VxCircularProgress, VxIconButton, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTooltip, VxTypography } from '@vexorion/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getImportHistory } from '../../../lib/api'
import type { ImportJobHistoryItemResponse } from '../../../types/api'

interface Props {
  importType: string
  refreshTrigger?: number
}

function statusChip(status: number, t: (k: string) => string) {
  switch (status) {
    case 1:
      return <VxChip label={t('pages.importData.history.statusLabels.draft')} size="small" />
    case 2:
      return <VxChip label={t('pages.importData.history.statusLabels.validated')} size="small" color="info" />
    case 3:
      return <VxChip label={t('pages.importData.history.statusLabels.failedValidation')} size="small" color="warning" />
    case 4:
      return <VxChip label={t('pages.importData.history.statusLabels.imported')} size="small" color="success" />
    case 5:
      return <VxChip label={t('pages.importData.history.statusLabels.importFailed')} size="small" color="error" />
    default:
      return <VxChip label={String(status)} size="small" />
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function effectiveDate(item: ImportJobHistoryItemResponse): string {
  return formatDate(item.completedAtUtc ?? item.submittedAtUtc ?? item.validatedAtUtc)
}

export default function ImportHistoryPanel({ importType, refreshTrigger }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ImportJobHistoryItemResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    getImportHistory(importType)
      .then((data) => {
        if (mountedRef.current) {
          setItems(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError(true)
          setLoading(false)
        }
      })
  }, [importType])

  useEffect(() => {
    load()
  }, [load, refreshTrigger])

  return (
    <VxBox sx={{ mt: 4 }}>
      <VxBox sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <VxTypography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {t('pages.importData.history.title')}
        </VxTypography>
        <VxTooltip title={t('pages.importData.history.refresh')}>
          <span>
            <VxIconButton onClick={load} size="small" disabled={loading} aria-label={t('pages.importData.history.refresh')}>
              <RefreshIcon fontSize="small" />
            </VxIconButton>
          </span>
        </VxTooltip>
      </VxBox>

      {loading && (
        <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <VxCircularProgress size={24} />
        </VxBox>
      )}

      {!loading && error && (
        <VxAlert severity="error" action={
          <VxIconButton size="small" color="inherit" onClick={load} aria-label={t('pages.importData.history.refresh')}>
            <RefreshIcon fontSize="small" />
          </VxIconButton>
        }>
          {t('pages.importData.history.error')}
        </VxAlert>
      )}

      {!loading && !error && items.length === 0 && (
        <VxTypography color="text.secondary" variant="body2">
          {t('pages.importData.history.empty')}
        </VxTypography>
      )}

      {!loading && !error && items.length > 0 && (
        <VxTableContainer>
          <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('pages.importData.history.table.date')}</VxTableCell>
              <VxTableCell>{t('pages.importData.history.table.file')}</VxTableCell>
              <VxTableCell>{t('pages.importData.history.table.status')}</VxTableCell>
              <VxTableCell align="right">{t('pages.importData.history.table.totalRows')}</VxTableCell>
              <VxTableCell align="right">{t('pages.importData.history.table.validRows')}</VxTableCell>
              <VxTableCell align="right">{t('pages.importData.history.table.invalidRows')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {items.map((item) => (
              <VxTableRow key={item.importJobId} hover>
                <VxTableCell sx={{ whiteSpace: 'nowrap' }}>{effectiveDate(item)}</VxTableCell>
                <VxTableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <VxTooltip title={item.sourceFileName}>
                    <span>{item.sourceFileName}</span>
                  </VxTooltip>
                </VxTableCell>
                <VxTableCell>{statusChip(item.status, t)}</VxTableCell>
                <VxTableCell align="right">{item.totalRows}</VxTableCell>
                <VxTableCell align="right">{item.validRows}</VxTableCell>
                <VxTableCell align="right">{item.invalidRows}</VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
          </VxTable>
        </VxTableContainer>
      )}
    </VxBox>
  )
}
