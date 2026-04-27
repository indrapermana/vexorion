import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getAuditLogs } from '../../../lib/api'
import type { AuditLogListItemResponse } from '../../../types/api'

export default function AuditLogsPage() {
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
    return <Alert severity="info">Sign in first. Audit logs require accounting permissions.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>Audit Logs</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Browse system activity with basic filtering for control-layer verification.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField size="small" label="Event type" value={eventType} onChange={(event) => setEventType(event.target.value)} />
          <TextField size="small" label="Entity" value={entityName} onChange={(event) => setEntityName(event.target.value)} />
          <TextField
            size="small"
            label="Page size"
            select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => void loadLogs()}>Refresh</Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Showing {items.length} of {totalCount} entries.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Created UTC</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.createdAtUtc}</TableCell>
                <TableCell>{item.eventType}</TableCell>
                <TableCell>{item.entityName ?? '-'}</TableCell>
                <TableCell>{item.description ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
