import { AddRoundedIcon, LockResetRoundedIcon, ManageAccountsRoundedIcon, PersonOffRoundedIcon, VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxConfirmActionButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPageBody, VxPageFeedback, VxPageHeader, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignUserRoles, createUser, getRoles, getTenants, getUsersForAdmin, resetUserPassword, setUserStatus } from '../lib/api'
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
      setError(err instanceof Error ? err.message : 'Unable to load users.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [canViewRoles, canViewTenants])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const userData = await getUsersForAdmin(selectedTenantId || undefined)
      setUsers(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTenantId])

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
      setError(err instanceof Error ? err.message : 'Unable to create user.')
      console.error(err)
    }
  }

  const handleSetUserStatus = async (user: UserListItemResponse, isActive: boolean) => {
    try {
      await setUserStatus(user.id, { isActive })
      setUsers((current) => current.map((x) => (x.id === user.id ? { ...x, isActive } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user status.')
      console.error(err)
    }
  }

  const handleAssignRoles = async () => {
    if (!rolesDialogUser) return

    try {
      await assignUserRoles(rolesDialogUser.id, { roles: rolesSelection })
      setUsers((current) => current.map((x) => (x.id === rolesDialogUser.id ? { ...x, roles: rolesSelection } : x)))
      setRolesDialogUser(null)
      setRolesSelection([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user roles.')
      console.error(err)
    }
  }

  const handleResetPassword = async () => {
    if (!resetDialogUser || !newPassword) return

    try {
      await resetUserPassword(resetDialogUser.id, { newPassword })
      setResetDialogUser(null)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
      console.error(err)
    }
  }

  const columns = useMemo<VxGridColDef<UserListItemResponse>[]>(
    () => [
      {
        field: 'userName',
        headerName: 'User',
        flex: 1,
        minWidth: 180,
        renderCell: (params) => canManage ? (
          <VxBox>
            <VxTypography variant="body2" sx={{ fontWeight: 600 }}>{params.row.userName}</VxTypography>
            <VxTypography variant="caption" color="text.secondary">{params.row.email}</VxTypography>
          </VxBox>
        ) : <VxTypography variant="caption" color="text.secondary">View only</VxTypography>,
      },
      {
        field: 'tenantId',
        headerName: 'Tenant',
        flex: 1,
        minWidth: 160,
        valueGetter: (_, row) => tenantNameMap.get(row.tenantId) ?? row.tenantId,
      },
      {
        field: 'roles',
        headerName: 'Roles',
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
        headerName: 'Status',
        width: 120,
        renderCell: (params) => <VxChip size="small" color={params.row.isActive ? 'success' : 'default'} label={params.row.isActive ? 'Active' : 'Inactive'} />,
      },
      {
        field: 'id',
        headerName: 'Actions',
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
                Update Roles
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
              Reset Password
            </VxButton>
            {params.row.isActive ? (
              <VxConfirmActionButton
                title="Deactivate user"
                targetName={`${params.row.userName} (${params.row.email})`}
                consequence="The user will immediately lose access but can be activated again later."
                confirmLabel="Deactivate user"
                confirmColor="warning"
                pendingLabel="Deactivating..."
                onConfirm={() => handleSetUserStatus(params.row, false)}
                buttonProps={{ size: 'small', color: 'warning', variant: 'outlined', startIcon: <PersonOffRoundedIcon /> }}
              >Deactivate</VxConfirmActionButton>
            ) : (
              <VxButton size="small" color="success" variant="outlined" onClick={() => void handleSetUserStatus(params.row, true)}>
                Activate
              </VxButton>
            )}
          </VxStack>
        ),
      },
    ],
    [canManage, canViewRoles, tenantNameMap],
  )

  return (
    <VxStack spacing={2.5}>
      <VxPageHeader
        title="Users"
        description="Manage tenant users, roles, password reset, and activation status."
        action={canManage && canViewRoles ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setIsCreateOpen(true)}>
            Add Tenant User
          </VxButton>
        ) : undefined}
        filters={canViewTenants ? (
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            {canViewTenants ? <VxTextField
              select
              size="small"
              label="Tenant filter"
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <VxMenuItem value="">All tenants</VxMenuItem>
              {tenants.map((tenant) => (
                <VxMenuItem key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</VxMenuItem>
              ))}
            </VxTextField> : null}
          </VxStack>
        ) : undefined}
      />

      <VxPageFeedback
        error={error}
        info={!canManage ? 'You have view-only access. User creation, role assignment, password reset, and status changes require the users.manage permission.' : undefined}
        onRetry={() => void Promise.all([loadMetadata(), loadUsers()])}
      />
      {canManage && !canViewRoles ? <VxAlert severity="info">Role data is unavailable without roles.view, so user creation and role assignment are hidden.</VxAlert> : null}

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
        <VxDialogTitle>Add Tenant User</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField label="Username" value={createForm.userName} onChange={(event) => setCreateForm((x) => ({ ...x, userName: event.target.value }))} />
            <VxTextField label="Email" value={createForm.email} onChange={(event) => setCreateForm((x) => ({ ...x, email: event.target.value }))} />
            <VxTextField label="Password" type="password" value={createForm.password} onChange={(event) => setCreateForm((x) => ({ ...x, password: event.target.value }))} />
            <VxTextField label="First name" value={createForm.firstName} onChange={(event) => setCreateForm((x) => ({ ...x, firstName: event.target.value }))} />
            <VxTextField label="Last name" value={createForm.lastName} onChange={(event) => setCreateForm((x) => ({ ...x, lastName: event.target.value }))} />
            <VxTextField
              select
              label="Roles"
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
          <VxButton onClick={() => setIsCreateOpen(false)}>Cancel</VxButton>
          <VxButton onClick={() => void handleCreateUser()} variant="contained">Create User</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && canViewRoles && Boolean(rolesDialogUser)} onClose={() => setRolesDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>Update Roles</VxDialogTitle>
        <VxDialogContent>
          <VxTextField
            sx={{ mt: 1 }}
            select
            label="Roles"
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
          <VxButton onClick={() => setRolesDialogUser(null)}>Cancel</VxButton>
          <VxButton onClick={() => void handleAssignRoles()} variant="contained">Save Roles</VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && Boolean(resetDialogUser)} onClose={() => setResetDialogUser(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>Reset Password</VxDialogTitle>
        <VxDialogContent>
          <VxTextField
            sx={{ mt: 1 }}
            fullWidth
            type="password"
            label="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setResetDialogUser(null)}>Cancel</VxButton>
          <VxButton onClick={() => void handleResetPassword()} variant="contained">Reset</VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
