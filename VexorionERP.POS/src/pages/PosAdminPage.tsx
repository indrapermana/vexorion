import { ArrowBackRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxDivider, VxPageBody, VxPageEmpty, VxPageFeedback, VxPageHeader, VxPageLoading, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
        setFeedback(t('admin.feedbackRoleUpdate', {
          action: grant ? t('admin.actionGranted') : t('admin.actionRevoked'),
          userName: targetUser.userName,
        }))
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

  const renderRoles = (user: UserListItemResponse) => (
    <VxStack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {user.roles.map((role) => (
        <VxChip key={role} size="small" label={role} color={role === POS_USER_ROLE ? 'primary' : 'default'} variant={role === POS_USER_ROLE ? 'filled' : 'outlined'} />
      ))}
      {user.roles.length === 0 ? <VxTypography variant="caption" color="text.secondary">{t('admin.noRoles')}</VxTypography> : null}
    </VxStack>
  )

  const renderRoleSwitch = (user: UserListItemResponse) => {
    const hasPosRole = user.roles.includes(POS_USER_ROLE)
    const isPending = pendingByUserId[user.id] ?? false
    return <VxSwitch
      checked={hasPosRole}
      slotProps={{ input: { 'aria-label': `${t('admin.posUser')}: ${user.userName}` } }}
      disabled={isPending || !user.isActive}
      onChange={(_, checked) => void togglePosRole(user, checked)}
      size="small"
      sx={{ minWidth: 44, minHeight: 44, display: 'inline-flex', justifyContent: 'center' }}
    />
  }

  const loadError = usersQuery.isError
    ? usersQuery.error instanceof Error ? usersQuery.error.message : t('admin.errorLoadUsers')
    : null

  return (
    <VxStack spacing={2} sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, maxWidth: '100%' }}>
      <VxPageHeader title={t('admin.title')} description={t('admin.subtitle')} action={(
        <VxButton component={Link} to="/" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
            {t('admin.back')}
        </VxButton>
      )} />

      <VxPageFeedback
        error={error ?? loadError}
        success={feedback}
        onRetry={loadError ? () => void usersQuery.refetch() : undefined}
        retryLabel={t('admin.retry')}
      />

      <VxPageBody>
        {usersQuery.isLoading ? (
          <VxPageLoading />
        ) : usersQuery.isError ? null
        : users.length === 0 ? (
          <VxPageEmpty title={t('admin.emptyTitle')} description={t('admin.emptyDescription')} />
        ) : (
          <>
          <VxTableContainer sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '100%' }} tabIndex={0} aria-label={t('admin.tableScrollLabel')}>
          <VxTable size="small" aria-label={t('admin.title')} sx={{ minWidth: 760 }}>
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
              {users.map((u) => (
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
                    <VxTableCell>{renderRoles(u)}</VxTableCell>
                    <VxTableCell>
                      <VxChip size="small" color={u.isActive ? 'success' : 'default'} label={u.isActive ? t('admin.active') : t('admin.inactive')} />
                    </VxTableCell>
                    <VxTableCell align="center">
                      {renderRoleSwitch(u)}
                    </VxTableCell>
                  </VxTableRow>
                ))}
            </VxTableBody>
          </VxTable>
          </VxTableContainer>

          <VxStack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }} aria-label={t('admin.mobileListLabel')}>
            {users.map((user) => (
              <VxPaper key={user.id} component="article" variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                <VxStack spacing={1.25}>
                  <VxStack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <VxBox sx={{ minWidth: 0 }}>
                      <VxTypography component="h2" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>{user.userName}</VxTypography>
                      {(user.firstName || user.lastName) ? <VxTypography variant="caption" color="text.secondary">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</VxTypography> : null}
                    </VxBox>
                    <VxChip size="small" color={user.isActive ? 'success' : 'default'} label={user.isActive ? t('admin.active') : t('admin.inactive')} />
                  </VxStack>
                  <VxTypography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{user.email}</VxTypography>
                  <VxDivider />
                  <VxBox>
                    <VxTypography variant="caption" color="text.secondary">{t('admin.currentRoles')}</VxTypography>
                    {renderRoles(user)}
                  </VxBox>
                  <VxStack direction="row" sx={{ minHeight: 44, alignItems: 'center', justifyContent: 'space-between' }}>
                    <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{t('admin.posUser')}</VxTypography>
                    {renderRoleSwitch(user)}
                  </VxStack>
                </VxStack>
              </VxPaper>
            ))}
          </VxStack>
          </>
        )}
      </VxPageBody>
    </VxStack>
  )
}
