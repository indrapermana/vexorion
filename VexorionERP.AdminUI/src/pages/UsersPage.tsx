import { AddRoundedIcon, LockResetRoundedIcon, ManageAccountsRoundedIcon, PersonOffRoundedIcon, VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxConfirmActionButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPageBody, VxPageFeedback, VxPageHeader, VxStack, VxTextField, VxTypography, isPasswordPolicyMet } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, assignUserRoles, createUser, getRoles, getTenants, getUsersForAdmin, reportClientDiagnostic, resetUserPassword, setUserStatus } from '../lib/api'
import type { CreateUserRequest, UserListItemResponse } from '../types/api/users'
import type { RolePermissionsResponse } from '../types/api/roles'
import type { TenantListItemResponse } from '../types/api'
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
  const [isLoading, setIsLoading] = useState(false)

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

  const handleCreateUser = async () => {
    setCreateErrors({})
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
      const created = await createUser(payload)
      setUsers((current) => [created, ...current])
      setCreateForm(initialCreateForm)
      setCreateRoles([])
      setIsCreateOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        setCreateErrors(err.validation)
        return
      }
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.create'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    }
  }

  const handleSetUserStatus = useCallback(async (user: UserListItemResponse, isActive: boolean) => {
    try {
      await setUserStatus(user.id, { isActive })
      setUsers((current) => current.map((x) => (x.id === user.id ? { ...x, isActive } : x)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.status'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    }
  }, [t])

  const handleAssignRoles = async () => {
    if (!rolesDialogUser) return

    try {
      await assignUserRoles(rolesDialogUser.id, { roles: rolesSelection })
      setUsers((current) => current.map((x) => (x.id === rolesDialogUser.id ? { ...x, roles: rolesSelection } : x)))
      setRolesDialogUser(null)
      setRolesSelection([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.roles'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    }
  }

  const handleResetPassword = async () => {
    if (!resetDialogUser || !newPassword) return

    try {
      await resetUserPassword(resetDialogUser.id, { newPassword })
      setResetDialogUser(null)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pages.users.errors.password'))
      if (!(err instanceof ApiError)) reportClientDiagnostic('operation.failed', err)
    }
  }

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
        minWidth: 360,
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
              <VxButton size="small" color="success" variant="outlined" onClick={() => void handleSetUserStatus(params.row, true)}>
                {t('pages.users.activate')}
              </VxButton>
            )}
          </VxStack>
        ),
      },
    ],
    [canManage, canViewRoles, handleSetUserStatus, t, tenantNameMap],
  )

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader
        title={t('pages.users.title')}
        description={t('pages.users.description')}
        action={canManage && canViewRoles ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setIsCreateOpen(true)}>
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
        info={!canManage ? t('pages.users.viewOnly') : undefined}
        onRetry={() => void Promise.all([loadMetadata(), loadUsers()])}
      />
      {canManage && !canViewRoles ? <VxAlert severity="info">{t('pages.users.roleWarning')}</VxAlert> : null}

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
          <VxButton onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleCreateUser()} variant="contained">{t('pages.users.create')}</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && canViewRoles && Boolean(rolesDialogUser)} onClose={() => setRolesDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.users.updateRoles')}</VxDialogTitle>
        <VxDialogContent>
          <VxTextField
            sx={{ mt: 1 }}
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
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setRolesDialogUser(null)}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleAssignRoles()} variant="contained">{t('pages.users.saveRoles')}</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && Boolean(resetDialogUser)} onClose={() => setResetDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.users.resetPassword')}</VxDialogTitle>
        <VxDialogContent>
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
          <VxButton onClick={() => setResetDialogUser(null)}>{t('common.cancel')}</VxButton>
          <VxButton onClick={() => void handleResetPassword()} variant="contained" disabled={!isPasswordPolicyMet(newPassword)}>{t('pages.users.reset')}</VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
