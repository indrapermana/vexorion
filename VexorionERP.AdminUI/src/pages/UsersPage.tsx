import { AddRoundedIcon, HistoryRoundedIcon, LockResetRoundedIcon, ManageAccountsRoundedIcon, PersonOffRoundedIcon, VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxConfirmActionButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPageBody, VxPageFeedback, VxPageHeader, VxStack, VxTextField, VxTypography, isPasswordPolicyMet } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, assignUserRoles, createUser, getAdminLifecycleAudit, getRoles, getTenants, getUsersForAdmin, reportClientDiagnostic, resetUserPassword, setUserStatus } from '../lib/api'
import type { CreateUserRequest, UserListItemResponse } from '../types/api/users'
import type { RolePermissionsResponse } from '../types/api/roles'
import type { TenantListItemResponse } from '../types/api'
import type { AdminLifecycleAuditItemResponse } from '../types/api/audit'
import { useAuth } from '../app/AuthContext'
import { AdminPermissions, hasAdminPermissions } from '../app/authorization'

type CreateUserFormState = {
  userName: string
  email: string
  password: string
  firstName: string
  lastName: string
}

const initialCreateForm: CreateUserFormState = {
  userName: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
}

export default function UsersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canManage = hasAdminPermissions(user?.permissions, { allOf: [AdminPermissions.users.manage] })
  const canViewRoles = hasAdminPermissions(user?.permissions, { allOf: [AdminPermissions.roles.view] })
  const canViewTenants = hasAdminPermissions(user?.permissions, { allOf: [AdminPermissions.tenants.view] })
  const [users, setUsers] = useState<UserListItemResponse[]>([])
  const [roles, setRoles] = useState<RolePermissionsResponse[]>([])
  const [tenants, setTenants] = useState<TenantListItemResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingRoles, setIsSavingRoles] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [auditDialogUser, setAuditDialogUser] = useState<UserListItemResponse | null>(null)
  const [auditItems, setAuditItems] = useState<AdminLifecycleAuditItemResponse[]>([])
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [createRoles, setCreateRoles] = useState<string[]>([])

  const [rolesDialogUser, setRolesDialogUser] = useState<UserListItemResponse | null>(null)
  const [rolesSelection, setRolesSelection] = useState<string[]>([])

  const [resetDialogUser, setResetDialogUser] = useState<UserListItemResponse | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [createErrors, setCreateErrors] = useState<Record<string, string[] | string>>({})

  const loadMetadata = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [roleData, tenantData] = await Promise.all([
        canViewRoles ? getRoles() : Promise.resolve([]),
        canViewTenants ? getTenants() : Promise.resolve([]),
      ])
      setRoles(roleData)
      setTenants(tenantData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.load'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [canViewRoles, canViewTenants, t])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const userData = await getUsersForAdmin(selectedTenantId || undefined)
      setUsers(userData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.load'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTenantId, t])

  useEffect(() => {
    void loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const tenantNameMap = useMemo(() => {
    const map = new Map<string, string>()
    tenants.forEach((tenant) => map.set(tenant.id, tenant.name))
    return map
  }, [tenants])

  const roleOptions = roles.map((x) => x.role)
  const currentTenant = tenants.find((tenant) => tenant.id === user?.tenantId)
  const currentTenantLabel = currentTenant ? `${currentTenant.name} (${currentTenant.code})` : user?.tenantId ?? t('pages.users.currentTenantFallback')
  const isCreationScopeMismatch = Boolean(selectedTenantId && selectedTenantId !== user?.tenantId)

  const handleCreateUser = async () => {
    setCreateErrors({})
    setError(null)
    setSuccess(null)
    if (!isPasswordPolicyMet(createForm.password)) {
      setCreateErrors({ Password: [t('login.passwordPolicy')] })
      return
    }

    const payload: CreateUserRequest = {
      userName: createForm.userName,
      email: createForm.email,
      password: createForm.password,
      firstName: createForm.firstName || null,
      lastName: createForm.lastName || null,
      roles: createRoles,
    }

    try {
      setIsCreating(true)
      const created = await createUser(payload)
      setUsers((current) => [created, ...current])
      setCreateForm(initialCreateForm)
      setCreateRoles([])
      setIsCreateOpen(false)
      setSuccess(t('pages.users.success.created'))
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        setCreateErrors(err.validation)
        return
      }
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.create'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSetUserStatus = useCallback(async (user: UserListItemResponse, isActive: boolean) => {
    setError(null)
    setSuccess(null)
    try {
      await setUserStatus(user.id, { isActive })
      setUsers((current) => current.map((x) => (x.id === user.id ? { ...x, isActive } : x)))
      setSuccess(t(isActive ? 'pages.users.success.activated' : 'pages.users.success.deactivated'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.status'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    }
  }, [t])

  const handleAssignRoles = async () => {
    if (!rolesDialogUser) return

    setError(null)
    setSuccess(null)
    try {
      setIsSavingRoles(true)
      await assignUserRoles(rolesDialogUser.id, { roles: rolesSelection })
      setUsers((current) => current.map((x) => (x.id === rolesDialogUser.id ? { ...x, roles: rolesSelection } : x)))
      setRolesDialogUser(null)
      setRolesSelection([])
      setSuccess(t('pages.users.success.roles'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.roles'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsSavingRoles(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetDialogUser || !newPassword) return

    setError(null)
    setSuccess(null)
    try {
      setIsResettingPassword(true)
      await resetUserPassword(resetDialogUser.id, { newPassword })
      setResetDialogUser(null)
      setNewPassword('')
      setSuccess(t('pages.users.success.password'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.password'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const openAuditHistory = useCallback(async (selectedUser: UserListItemResponse) => {
    setAuditDialogUser(selectedUser)
    setAuditItems([])
    setAuditError(null)
    setIsAuditLoading(true)
    try {
      const response = await getAdminLifecycleAudit(selectedUser.tenantId, selectedUser.id)
      setAuditItems(response.items)
    } catch (err) {
      setAuditError(err instanceof ApiError ? err.message : t('pages.users.audit.loadError'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    } finally {
      setIsAuditLoading(false)
    }
  }, [t])

  const columns = useMemo<VxGridColDef<UserListItemResponse>[]>(
    () => [
      {
        field: 'userName',
        headerName: t('pages.users.columns.user'),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => canManage ? (
          <VxBox>
            <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{params.row.userName}</VxTypography>
            <VxTypography variant="caption" color="text.secondary">{params.row.email}</VxTypography>
          </VxBox>
        ) : <VxTypography variant="caption" color="text.secondary">{t('common.viewOnly')}</VxTypography>,
      },
      {
        field: 'tenantId',
        headerName: t('pages.users.columns.tenant'),
        flex: 1,
        minWidth: 160,
        valueGetter: (_, row) => tenantNameMap.get(row.tenantId) ?? row.tenantId,
      },
      {
        field: 'roles',
        headerName: t('pages.users.columns.roles'),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <VxStack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {params.row.roles.map((role) => (
              <VxChip key={`${params.row.id}-${role}`} size="small" label={role} />
            ))}
          </VxStack>
        ),
      },
      {
        field: 'isActive',
        headerName: t('pages.users.columns.status'),
        width: 120,
        renderCell: (params) => <VxChip size="small" color={params.row.isActive ? 'success' : 'default'} label={params.row.isActive ? t('components.tenants.grid.active') : t('components.tenants.grid.inactive')} />,
      },
      {
        field: 'id',
        headerName: t('pages.users.columns.actions'),
        minWidth: 480,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <VxStack direction="row" spacing={1}>
            {canViewRoles ? (
              <VxButton
                size="small"
                variant="outlined"
                startIcon={<ManageAccountsRoundedIcon />}
                onClick={() => {
                  setRolesDialogUser(params.row)
                  setRolesSelection(params.row.roles)
                }}
              >
                {t('pages.users.updateRoles')}
              </VxButton>
            ) : null}
            <VxButton
              size="small"
              variant="outlined"
              startIcon={<LockResetRoundedIcon />}
              onClick={() => {
                setResetDialogUser(params.row)
                setNewPassword('')
              }}
            >
              {t('pages.users.resetPassword')}
            </VxButton>
            <VxButton size="small" variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => void openAuditHistory(params.row)}>
              {t('pages.users.audit.action')}
            </VxButton>
            {params.row.isActive ? (
              <VxConfirmActionButton
                title={t('pages.users.deactivateTitle')}
                targetName={`${params.row.userName} (${params.row.email})`}
                consequence={t('pages.users.deactivateConsequence')}
                confirmLabel={t('pages.users.deactivateTitle')}
                confirmColor="warning"
                pendingLabel={t('pages.users.deactivating')}
                onConfirm={() => handleSetUserStatus(params.row, false)}
                buttonProps={{ size: 'small', color: 'warning', variant: 'outlined', startIcon: <PersonOffRoundedIcon /> }}
              >{t('pages.users.deactivate')}</VxConfirmActionButton>
            ) : (
              <VxButton size="small" color="success" variant="outlined" title={t('pages.users.activateContext')} onClick={() => void handleSetUserStatus(params.row, true)}>
                {t('pages.users.activate')}
              </VxButton>
            )}
          </VxStack>
        ),
      },
    ],
    [canManage, canViewRoles, handleSetUserStatus, openAuditHistory, t, tenantNameMap],
  )

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader
        title={t('pages.users.title')}
        description={t('pages.users.description')}
        action={canManage && canViewRoles ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} disabled={isCreationScopeMismatch} title={isCreationScopeMismatch ? t('pages.users.createScopeMismatch', { tenant: currentTenantLabel }) : undefined} onClick={() => setIsCreateOpen(true)}>
            {t('pages.users.add')}
          </VxButton>
        ) : undefined}
        filters={canViewTenants ? (
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            {canViewTenants ? <VxTextField
              select
              size="small"
              label={t('pages.users.tenantFilter')}
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <VxMenuItem value="">{t('pages.users.allTenants')}</VxMenuItem>
              {tenants.map((tenant) => (
                <VxMenuItem key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</VxMenuItem>
              ))}
            </VxTextField> : null}
          </VxStack>
        ) : undefined}
      />

      <VxPageFeedback
        error={error}
        success={success}
        info={!canManage ? t('pages.users.viewOnly') : undefined}
        onRetry={() => void Promise.all([loadMetadata(), loadUsers()])}
        retryLabel={t('common.retry')}
      />
      {canManage && !canViewRoles ? <VxAlert severity="info">{t('pages.users.roleWarning')}</VxAlert> : null}
      {canManage && canViewRoles && isCreationScopeMismatch ? <VxAlert severity="info">{t('pages.users.createScopeMismatch', { tenant: currentTenantLabel })}</VxAlert> : null}

      <VxPageBody>
        <VxDataGrid
          preferenceKey="admin-users"
          rows={users}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          sx={{ height: 620 }}
        />
      </VxPageBody>

      <VxDialog open={canManage && canViewRoles && isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.users.add')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxAlert severity="info">{t('pages.users.createScope', { tenant: currentTenantLabel })}</VxAlert>
            <VxAlert severity="warning">{t('pages.users.createSecurity')}</VxAlert>
            <VxTextField label={t('pages.users.username')} value={createForm.userName} onChange={(event) => setCreateForm((x) => ({ ...x, userName: event.target.value }))} error={Boolean(createErrors.UserName)} helperText={[createErrors.UserName].flat()[0]} />
            <VxTextField label={t('pages.users.email')} value={createForm.email} onChange={(event) => setCreateForm((x) => ({ ...x, email: event.target.value }))} error={Boolean(createErrors.Email)} helperText={[createErrors.Email].flat()[0]} />
            <VxTextField label={t('pages.users.password')} type="password" autoComplete="new-password" value={createForm.password} onChange={(event) => setCreateForm((x) => ({ ...x, password: event.target.value }))} error={Boolean(createErrors.Password) || (createForm.password.length > 0 && !isPasswordPolicyMet(createForm.password))} helperText={[createErrors.Password].flat()[0] ?? t('login.passwordPolicy')} />
            <VxTextField label={t('pages.users.firstName')} value={createForm.firstName} onChange={(event) => setCreateForm((x) => ({ ...x, firstName: event.target.value }))} />
            <VxTextField label={t('pages.users.lastName')} value={createForm.lastName} onChange={(event) => setCreateForm((x) => ({ ...x, lastName: event.target.value }))} />
            <VxTextField
              select
              label={t('pages.users.roles')}
              value={createRoles}
              onChange={(event) => setCreateRoles(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
            >
              {roleOptions.map((role) => (
                <VxMenuItem key={role} value={role}>{role}</VxMenuItem>
              ))}
            </VxTextField>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setIsCreateOpen(false)} disabled={isCreating}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleCreateUser()} variant="contained" disabled={isCreating}>{isCreating ? t('common.saving') : t('pages.users.create')}</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && canViewRoles && Boolean(rolesDialogUser)} onClose={() => setRolesDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.users.updateRoles')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxAlert severity="warning">{t('pages.users.roleContext', { user: rolesDialogUser?.userName ?? '' })}</VxAlert>
            <VxTextField
              select
              label={t('pages.users.roles')}
              value={rolesSelection}
              onChange={(event) => setRolesSelection(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
              fullWidth
            >
              {roleOptions.map((role) => (
                <VxMenuItem key={role} value={role}>{role}</VxMenuItem>
              ))}
            </VxTextField>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setRolesDialogUser(null)} disabled={isSavingRoles}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleAssignRoles()} variant="contained" disabled={isSavingRoles}>{isSavingRoles ? t('common.saving') : t('pages.users.saveRoles')}</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && Boolean(resetDialogUser)} onClose={() => setResetDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.users.resetPassword')}</VxDialogTitle>
        <VxDialogContent>
          <VxAlert severity="warning" sx={{ mt: 1 }}>{t('pages.users.passwordContext', { user: resetDialogUser?.userName ?? '' })}</VxAlert>
          <VxTextField
            sx={{ mt: 1 }}
            fullWidth
            type="password"
            label={t('pages.users.newPassword')}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={newPassword.length > 0 && !isPasswordPolicyMet(newPassword)}
            helperText={t('login.passwordPolicy')}
          />
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setResetDialogUser(null)} disabled={isResettingPassword}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleResetPassword()} variant="contained" disabled={isResettingPassword || !isPasswordPolicyMet(newPassword)}>{isResettingPassword ? t('common.saving') : t('pages.users.reset')}</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={Boolean(auditDialogUser)} onClose={() => setAuditDialogUser(null)} maxWidth="md" fullWidth>
        <VxDialogTitle>{t('pages.users.audit.title', { user: auditDialogUser?.userName ?? '' })}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={1.5} sx={{ mt: 1 }}>
            <VxAlert severity="info">{t('pages.users.audit.scope')}</VxAlert>
            {isAuditLoading ? <VxTypography role="status">{t('pages.users.audit.loading')}</VxTypography> : null}
            {auditError ? <VxAlert severity="error">{auditError}</VxAlert> : null}
            {!isAuditLoading && !auditError && auditItems.length === 0 ? <VxTypography color="text.secondary">{t('pages.users.audit.empty')}</VxTypography> : null}
            {auditItems.map((item) => (
              <VxBox key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <VxTypography variant="subtitle2">{item.eventType}</VxTypography>
                  <VxTypography variant="caption" color="text.secondary">{new Date(item.createdAtUtc).toLocaleString()}</VxTypography>
                </VxStack>
                <VxTypography variant="body2">{item.description ?? t('pages.users.audit.noDescription')}</VxTypography>
                <VxTypography variant="caption" color="text.secondary">{t('pages.users.audit.actor', { actor: item.actorUserName ?? t('pages.users.audit.system') })}</VxTypography>
                {item.correlationId ? <VxTypography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('pages.users.audit.trace', { trace: item.correlationId })}</VxTypography> : null}
              </VxBox>
            ))}
          </VxStack>
        </VxDialogContent>
        <VxDialogActions><VxButton onClick={() => setAuditDialogUser(null)}>{t('common.close')}</VxButton></VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
