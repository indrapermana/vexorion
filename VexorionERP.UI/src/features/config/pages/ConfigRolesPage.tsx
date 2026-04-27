import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getRolePermissions } from '../../../lib/api'
import type { RolePermissionsResponse } from '../../../types/api'

export default function ConfigRolesPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<RolePermissionsResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadRoles = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      return
    }

    setError(null)
    try {
      const response = await getRolePermissions()
      setItems(response)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.roles.errors.load'))
      }
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  if (!isAuthenticated) {
    return <Alert severity="info">{t('config.roles.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('config.roles.title')}</Typography>
        <Typography color="text.secondary">
          {t('config.roles.description')}
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 180 }}>{t('config.roles.columns.role')}</TableCell>
              <TableCell>{t('config.roles.columns.permissions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.role}>
                <TableCell sx={{ fontWeight: 700 }}>{item.role}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {item.permissions.map((permission) => (
                      <Chip key={permission} size="small" label={permission} variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
