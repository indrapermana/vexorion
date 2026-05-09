import { AddRoundedIcon, LockResetRoundedIcon, ManageAccountsRoundedIcon, PersonOffRoundedIcon, VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@vexorion/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignUserRoles, createUser, getRoles, getTenants, getUsersForAdmin, resetUserPassword, setUserStatus } from '../lib/api'
import type { CreateUserRequest, UserListItemResponse } from '../types/api/users'
import type { RolePermissionsResponse } from '../types/api/roles'
import type { TenantListItemResponse } from '../types/api'

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
      const [roleData, tenantData] = await Promise.all([getRoles(), getTenants()])
      setRoles(roleData)
      setTenants(tenantData)
    } catch (err) {
      setError('Unable to load users.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const userData = await getUsersForAdmin(selectedTenantId || undefined)
      setUsers(userData)
    } catch (err) {
      setError('Unable to load users.')
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
      setError('Unable to create user.')
      console.error(err)
    }
  }

  const handleSetUserStatus = async (user: UserListItemResponse, isActive: boolean) => {
    try {
      await setUserStatus(user.id, { isActive })
      setUsers((current) => current.map((x) => (x.id === user.id ? { ...x, isActive } : x)))
    } catch (err) {
      setError('Unable to update user status.')
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
      setError('Unable to update user roles.')
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
      setError('Unable to reset password.')
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
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.row.userName}</Typography>
            <Typography variant="caption" color="text.secondary">{params.row.email}</Typography>
          </Box>
        ),
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
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            {params.row.roles.map((role) => (
              <Chip key={`${params.row.id}-${role}`} size="small" label={role} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => <Chip size="small" color={params.row.isActive ? 'success' : 'default'} label={params.row.isActive ? 'Active' : 'Inactive'} />,
      },
      {
        field: 'id',
        headerName: 'Actions',
        minWidth: 360,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ManageAccountsRoundedIcon />}
              onClick={() => {
                setRolesDialogUser(params.row)
                setRolesSelection(params.row.roles)
              }}
            >
              Update Roles
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LockResetRoundedIcon />}
              onClick={() => {
                setResetDialogUser(params.row)
                setNewPassword('')
              }}
            >
              Reset Password
            </Button>
            <Button
              size="small"
              color={params.row.isActive ? 'warning' : 'success'}
              variant="outlined"
              startIcon={<PersonOffRoundedIcon />}
              onClick={() => void handleSetUserStatus(params.row, !params.row.isActive)}
            >
              {params.row.isActive ? 'Remove' : 'Activate'}
            </Button>
          </Stack>
        ),
      },
    ],
    [tenantNameMap],
  )

  return (
    <Stack spacing={2.5}>
      <Paper className="hero-panel" elevation={0}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5">Users</Typography>
            <Typography color="text.secondary">Manage tenant users, roles, password reset, and activation status.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField
              select
              size="small"
              label="Tenant filter"
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">All tenants</MenuItem>
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setIsCreateOpen(true)}>
              Add Tenant User
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper className="panel-card products-grid-panel" elevation={0}>
        <VxDataGrid
          rows={users}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          sx={{ height: 620 }}
        />
      </Paper>

      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tenant User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Username" value={createForm.userName} onChange={(event) => setCreateForm((x) => ({ ...x, userName: event.target.value }))} />
            <TextField label="Email" value={createForm.email} onChange={(event) => setCreateForm((x) => ({ ...x, email: event.target.value }))} />
            <TextField label="Password" type="password" value={createForm.password} onChange={(event) => setCreateForm((x) => ({ ...x, password: event.target.value }))} />
            <TextField label="First name" value={createForm.firstName} onChange={(event) => setCreateForm((x) => ({ ...x, firstName: event.target.value }))} />
            <TextField label="Last name" value={createForm.lastName} onChange={(event) => setCreateForm((x) => ({ ...x, lastName: event.target.value }))} />
            <TextField
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
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleCreateUser()} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rolesDialogUser)} onClose={() => setRolesDialogUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Roles</DialogTitle>
        <DialogContent>
          <TextField
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
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRolesDialogUser(null)}>Cancel</Button>
          <Button onClick={() => void handleAssignRoles()} variant="contained">Save Roles</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetDialogUser)} onClose={() => setResetDialogUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            fullWidth
            type="password"
            label="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogUser(null)}>Cancel</Button>
          <Button onClick={() => void handleResetPassword()} variant="contained">Reset</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
