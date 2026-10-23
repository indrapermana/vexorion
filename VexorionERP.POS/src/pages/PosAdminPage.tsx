import { ArrowBackRoundedIcon } from '@vexorion/ui'
import { VxButton, VxChip, VxPageBody, VxPageFeedback, VxPageHeader, VxPageLoading, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
    [queryClient, t],
  )

  return (
    <VxStack spacing={2} sx={{ p: 2 }}>
      <VxPageHeader title={t('admin.title')} description={t('admin.subtitle')} action={(
        <VxButton component={Link} to="/" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
            {t('admin.back')}
        </VxButton>
      )} />

      <VxPageFeedback error={error} success={feedback} />

      <VxPageBody>
        {usersQuery.isLoading ? (
          <VxPageLoading />
        ) : (
          <VxTable size="small" aria-label={t('admin.title')}>
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('admin.user')}</VxTableCell>
                <VxTableCell>{t('admin.email')}</VxTableCell>
                <VxTableCell>{t('admin.currentRoles')}</VxTableCell>
                <VxTableCell>{t('admin.status')}</VxTableCell>
                <VxTableCell align="center">{t('admin.posUser')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {users.map((u) => {
                const hasPosRole = u.roles.includes(POS_USER_ROLE)
                const isPending = pendingByUserId[u.id] ?? false
                return (
                  <VxTableRow key={u.id}>
                    <VxTableCell>
                      <VxTypography variant="body2" sx={{ fontWeight: 600 }}>
                        {u.userName}
                      </VxTypography>
                      {(u.firstName || u.lastName) ? (
                        <VxTypography variant="caption" color="text.secondary">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                        </VxTypography>
                      ) : null}
                    </VxTableCell>
                    <VxTableCell>{u.email}</VxTableCell>
                    <VxTableCell>
                      <VxStack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                        {u.roles.map((role) => (
                          <VxChip
                            key={role}
                            size="small"
                            label={role}
                            color={role === POS_USER_ROLE ? 'primary' : 'default'}
                            variant={role === POS_USER_ROLE ? 'filled' : 'outlined'}
                          />
                        ))}
                        {u.roles.length === 0 ? (
                          <VxTypography variant="caption" color="text.secondary">{t('admin.noRoles')}</VxTypography>
                        ) : null}
                      </VxStack>
                    </VxTableCell>
                    <VxTableCell>
                      <VxChip size="small" color={u.isActive ? 'success' : 'default'} label={u.isActive ? t('admin.active') : t('admin.inactive')} />
                    </VxTableCell>
                    <VxTableCell align="center">
                      <VxSwitch
                        checked={hasPosRole}
                        slotProps={{ input: { 'aria-label': `${t('admin.posUser')}: ${u.userName}` } }}
                        disabled={isPending || !u.isActive}
                        onChange={(_, checked) => void togglePosRole(u, checked)}
                        size="small"
                      />
                    </VxTableCell>
                  </VxTableRow>
                )
              })}
            </VxTableBody>
          </VxTable>
        )}
      </VxPageBody>
    </VxStack>
  )
}
