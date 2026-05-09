import { RefreshIcon } from '@vexorion/ui'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@vexorion/ui'
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
      return <Chip label={t('config.importData.history.statusLabels.draft')} size="small" />
    case 2:
      return <Chip label={t('config.importData.history.statusLabels.validated')} size="small" color="info" />
    case 3:
      return <Chip label={t('config.importData.history.statusLabels.failedValidation')} size="small" color="warning" />
    case 4:
      return <Chip label={t('config.importData.history.statusLabels.imported')} size="small" color="success" />
    case 5:
      return <Chip label={t('config.importData.history.statusLabels.importFailed')} size="small" color="error" />
    default:
      return <Chip label={String(status)} size="small" />
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
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {t('config.importData.history.title')}
        </Typography>
        <Tooltip title={t('config.importData.history.refresh')}>
          <span>
            <IconButton onClick={load} size="small" disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" action={
          <IconButton size="small" color="inherit" onClick={load}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }>
          {t('config.importData.history.error')}
        </Alert>
      )}

      {!loading && !error && items.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          {t('config.importData.history.empty')}
        </Typography>
      )}

      {!loading && !error && items.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('config.importData.history.table.date')}</TableCell>
              <TableCell>{t('config.importData.history.table.file')}</TableCell>
              <TableCell>{t('config.importData.history.table.status')}</TableCell>
              <TableCell align="right">{t('config.importData.history.table.totalRows')}</TableCell>
              <TableCell align="right">{t('config.importData.history.table.validRows')}</TableCell>
              <TableCell align="right">{t('config.importData.history.table.invalidRows')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.importJobId} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{effectiveDate(item)}</TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={item.sourceFileName}>
                    <span>{item.sourceFileName}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{statusChip(item.status, t)}</TableCell>
                <TableCell align="right">{item.totalRows}</TableCell>
                <TableCell align="right">{item.validRows}</TableCell>
                <TableCell align="right">{item.invalidRows}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
