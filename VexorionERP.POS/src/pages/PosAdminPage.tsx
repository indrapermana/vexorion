import { AdminPanelSettingsRoundedIcon, ArrowBackRoundedIcon } from '@vexorion/ui'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, assignUserRoles, getUsers } from '../lib/api'
import type { UserListItemResponse } from '../types/api'
import { useI18n } from '../app/I18nContext'

const POS_USER_ROLE = 'PosUser'

export default function PosAdminPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [pendingByUserId, setPendingByUserId] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: ['pos-admin', 'users'], queryFn: getUsers, staleTime: 60_000 })
  const users = usersQuery.data ?? []

  const togglePosRole = useCallback(
    async (targetUser: UserListItemResponse, grant: boolean) => {
      setError(null)
      setFeedback(null)
      setPendingByUserId((prev) => ({ ...prev, [targetUser.id]: true }))

      try {
        const currentRoles = targetUser.roles ?? []
        const nextRoles = grant
          ? Array.from(new Set([...currentRoles, POS_USER_ROLE]))
          : currentRoles.filter((role) => role !== POS_USER_ROLE)

        await assignUserRoles(targetUser.id, { roles: nextRoles })
        await queryClient.invalidateQueries({ queryKey: ['pos-admin', 'users'] })
        setFeedback(t('admin.feedbackRoleUpdate', { action: grant ? 'Granted' : 'Revoked', userName: targetUser.userName }))
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message)
        } else {
          setError(t('admin.errorUpdateRole'))
        }
      } finally {
        setPendingByUserId((prev) => ({ ...prev, [targetUser.id]: false }))
      }
    },
    [queryClient],
  )

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AdminPanelSettingsRoundedIcon color="primary" />
            <Box>
              <Typography variant="h5">{t('admin.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('admin.subtitle')}</Typography>
            </Box>
          </Stack>
          <Button component={Link} to="/" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
            {t('admin.back')}
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        {usersQuery.isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.user')}</TableCell>
                <TableCell>{t('admin.email')}</TableCell>
                <TableCell>{t('admin.currentRoles')}</TableCell>
                <TableCell>{t('admin.status')}</TableCell>
                <TableCell align="center">{t('admin.posUser')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const hasPosRole = u.roles.includes(POS_USER_ROLE)
                const isPending = pendingByUserId[u.id] ?? false
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {u.userName}
                      </Typography>
                      {(u.firstName || u.lastName) ? (
                        <Typography variant="caption" color="text.secondary">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                        {u.roles.map((role) => (
                          <Chip
                            key={role}
                            size="small"
                            label={role}
                            color={role === POS_USER_ROLE ? 'primary' : 'default'}
                            variant={role === POS_USER_ROLE ? 'filled' : 'outlined'}
                          />
                        ))}
                        {u.roles.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">{t('admin.noRoles')}</Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={u.isActive ? 'success' : 'default'} label={u.isActive ? t('admin.active') : t('admin.inactive')} />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={hasPosRole}
                        disabled={isPending || !u.isActive}
                        onChange={(_, checked) => void togglePosRole(u, checked)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  )
}
