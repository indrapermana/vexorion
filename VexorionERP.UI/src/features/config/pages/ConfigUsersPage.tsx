import { useCallback, useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxChip, VxConfirmActionDialog, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography, isPasswordPolicyMet } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import {
  ApiError,
  assignUserRoles,
  createUser,
  getRolePermissions,
  getUsers,
  setUserStatus,
} from '../../../lib/api'
import type {
  CreateUserRequest,
  RolePermissionsResponse,
  UserListItemResponse,
} from '../../../types/api'

type CreateUserDraft = {
  userName: string
  email: string
  password: string
  firstName: string
  lastName: string
  roles: string[]
}

const defaultDraft: CreateUserDraft = {
  userName: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  roles: [],
}

export default function ConfigUsersPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManageUsers = user?.permissions.includes(Permissions.users.manage) ?? false
  const canViewRoles = user?.permissions.includes(Permissions.roles.view) ?? false
  const canManageRoles = user?.permissions.includes(Permissions.roles.manage) ?? false
  const canEditRoles = canViewRoles && canManageRoles
  const [users, setUsers] = useState<UserListItemResponse[]>([])
  const [roles, setRoles] = useState<RolePermissionsResponse[]>([])
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, string[]>>({})
  const [initialRoleDraftByUserId, setInitialRoleDraftByUserId] = useState<Record<string, string[]>>({})
  const [createDraft, setCreateDraft] = useState<CreateUserDraft>(defaultDraft)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<UserListItemResponse | null>(null)
  const { confirmationDialog } = useUnsavedChangesPrompt(
    (canManageUsers && JSON.stringify(createDraft) !== JSON.stringify(defaultDraft))
      || (canEditRoles && JSON.stringify(roleDraftByUserId) !== JSON.stringify(initialRoleDraftByUserId)),
    isSaving,
    () => {},
    () => {
      setCreateDraft(defaultDraft)
      setRoleDraftByUserId(initialRoleDraftByUserId)
    },
  )

  const roleOptions = useMemo(() => roles.map((item) => item.role), [roles])

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setUsers([])
      setRoles([])
      return
    }

    setError(null)
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        getUsers(),
        canViewRoles ? getRolePermissions() : Promise.resolve([]),
      ])
      setUsers(nextUsers)
      setRoles(nextRoles)
      const nextRoleDrafts = nextUsers.reduce<Record<string, string[]>>((acc, user) => {
        acc[user.id] = [...user.roles]
        return acc
      }, {})
      setRoleDraftByUserId(nextRoleDrafts)
      setInitialRoleDraftByUserId(nextRoleDrafts)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.users.errors.load'))
      }
    }
  }, [canViewRoles, isAuthenticated, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateRoleDraft = (userId: string, value: unknown) => {
    if (!canEditRoles) return
    const rolesValue = Array.isArray(value)
      ? value.map((item) => String(item))
      : String(value)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

    setRoleDraftByUserId((previous) => ({ ...previous, [userId]: rolesValue }))
  }

  const saveUserRoles = async (userId: string) => {
    if (!canEditRoles) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)
    try {
      await assignUserRoles(userId, { roles: roleDraftByUserId[userId] ?? [] })
      setFeedback(t('config.users.feedback.rolesUpdated'))
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.users.errors.updateRoles'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const updateUserStatus = async (user: UserListItemResponse, isActive: boolean) => {
    if (!canManageUsers) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)
    try {
      await setUserStatus(user.id, { isActive })
      setFeedback(t('config.users.feedback.userStatus', { userName: user.userName, state: isActive ? t('config.users.states.enabled') : t('config.users.states.disabled') }))
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.users.errors.updateStatus'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const submitCreate = async () => {
    if (!canManageUsers) return
    setError(null)
    setFeedback(null)
    if (!isPasswordPolicyMet(createDraft.password)) {
      setError(t('pages.auth.login.passwordPolicy'))
      return
    }
    setIsSaving(true)

    const payload: CreateUserRequest = {
      userName: createDraft.userName.trim(),
      email: createDraft.email.trim(),
      password: createDraft.password,
      firstName: createDraft.firstName.trim() || null,
      lastName: createDraft.lastName.trim() || null,
      employeeId: null,
      roles: createDraft.roles,
    }

    try {
      await createUser(payload)
      setFeedback(t('config.users.feedback.userCreated', { userName: payload.userName }))
      setCreateDraft(defaultDraft)
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        const details = Object.values(saveError.validation ?? {}).flat().join(' ')
        setError(details || saveError.message)
      } else {
        setError(t('config.users.errors.create'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('config.users.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('config.users.title')} description={t('config.users.description')} />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
      {!canManageUsers ? <PermissionReadOnlyAlert requiredPermission={Permissions.users.manage} /> : null}
      {!canManageRoles ? <PermissionReadOnlyAlert requiredPermission={Permissions.roles.manage} /> : null}
      {canManageRoles && !canViewRoles ? <PermissionReadOnlyAlert requiredPermission={Permissions.roles.view} /> : null}

      {canManageUsers ? <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 2 }}>{t('config.users.createSection')}</VxTypography>
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <VxTextField
            label={t('config.users.fields.userName')}
            size="small"
            value={createDraft.userName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, userName: event.target.value }))}
          />
          <VxTextField
            label={t('config.users.fields.email')}
            size="small"
            value={createDraft.email}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, email: event.target.value }))}
          />
          <VxTextField
            label={t('config.users.fields.password')}
            size="small"
            type="password"
            autoComplete="new-password"
            value={createDraft.password}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, password: event.target.value }))}
            error={createDraft.password.length > 0 && !isPasswordPolicyMet(createDraft.password)}
            helperText={t('pages.auth.login.passwordPolicy')}
          />
          <VxTextField
            label={t('config.users.fields.firstName')}
            size="small"
            value={createDraft.firstName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, firstName: event.target.value }))}
          />
          <VxTextField
            label={t('config.users.fields.lastName')}
            size="small"
            value={createDraft.lastName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, lastName: event.target.value }))}
          />
          <VxTextField
            label={t('config.users.fields.roles')}
            size="small"
            select
            slotProps={{ select: { multiple: true } }}
            value={createDraft.roles}
            onChange={(event) => {
              const rolesValue = event.target.value
              setCreateDraft((prev) => ({
                ...prev,
                roles: Array.isArray(rolesValue) ? rolesValue.map((value) => String(value)) : [String(rolesValue)],
              }))
            }}
            sx={{ minWidth: 220 }}
          >
            {roleOptions.map((role) => (
              <VxMenuItem key={role} value={role}>{role}</VxMenuItem>
            ))}
          </VxTextField>
          <VxButton variant="contained" disabled={isSaving} onClick={() => void submitCreate()}>{t('config.users.createButton')}</VxButton>
        </VxStack>
      </VxPaper> : null}

      <PageBody>
        <VxTypography component="h2" variant="h6" sx={{ mb: 1.5 }}>{t('config.users.listSection')}</VxTypography>
        <VxTable size="small" aria-label={t('config.users.listSection')}>
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('config.users.columns.user')}</VxTableCell>
              <VxTableCell>{t('config.users.columns.email')}</VxTableCell>
              <VxTableCell sx={{ minWidth: 220 }}>{t('config.users.columns.roles')}</VxTableCell>
              <VxTableCell>{t('config.users.columns.active')}</VxTableCell>
              <VxTableCell align="right">{t('config.users.columns.actions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {users.map((user) => (
              <VxTableRow key={user.id}>
                <VxTableCell>
                  <VxStack spacing={0.4}>
                    <VxTypography sx={{ fontWeight: 700 }}>{user.userName}</VxTypography>
                    <VxStack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                      {(roleDraftByUserId[user.id] ?? user.roles).map((role) => (
                        <VxChip key={`${user.id}:${role}`} size="small" label={role} variant="outlined" />
                      ))}
                    </VxStack>
                  </VxStack>
                </VxTableCell>
                <VxTableCell>{user.email}</VxTableCell>
                <VxTableCell>
                  <VxTextField
                    size="small"
                    select
                    slotProps={{
                      select: {
                        multiple: true,
                        'aria-label': `${t('config.users.columns.roles')}: ${user.userName}`,
                      },
                    }}
                    value={roleDraftByUserId[user.id] ?? user.roles}
                    onChange={(event) => updateRoleDraft(user.id, event.target.value)}
                    disabled={!canEditRoles}
                    fullWidth
                  >
                    {roleOptions.map((role) => (
                      <VxMenuItem key={role} value={role}>{role}</VxMenuItem>
                    ))}
                  </VxTextField>
                </VxTableCell>
                <VxTableCell>
                  <VxSwitch
                    checked={user.isActive}
                    slotProps={{ input: { 'aria-label': `${t('config.users.columns.active')}: ${user.userName}` } }}
                    onChange={(event) => {
                      if (event.target.checked) void updateUserStatus(user, true)
                      else setDeactivateTarget(user)
                    }}
                    disabled={isSaving || !canManageUsers}
                  />
                </VxTableCell>
                <VxTableCell align="right">
                  {canEditRoles ? <VxButton
                    size="small"
                    variant="outlined"
                    aria-label={`${t('config.users.saveRolesButton')}: ${user.userName}`}
                    disabled={isSaving}
                    onClick={() => void saveUserRoles(user.id)}
                  >
                    {t('config.users.saveRolesButton')}
                  </VxButton> : null}
                </VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      </PageBody>

      <VxConfirmActionDialog
        open={Boolean(deactivateTarget)}
        title={t('config.users.deactivateDialog.title')}
        targetName={deactivateTarget ? `${deactivateTarget.userName} (${deactivateTarget.email})` : ''}
        consequence={t('config.users.deactivateDialog.consequence')}
        confirmLabel={t('config.users.deactivateDialog.confirm')}
        confirmColor="warning"
        pendingLabel={t('config.users.deactivateDialog.pending')}
        pending={isSaving}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return
          void updateUserStatus(deactivateTarget, false).then(() => setDeactivateTarget(null))
        }}
      />
      {confirmationDialog}
    </VxStack>
  )
}
