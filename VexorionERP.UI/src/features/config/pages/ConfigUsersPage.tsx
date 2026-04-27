import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
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
  const { isAuthenticated } = useAuth()
  const [users, setUsers] = useState<UserListItemResponse[]>([])
  const [roles, setRoles] = useState<RolePermissionsResponse[]>([])
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, string[]>>({})
  const [createDraft, setCreateDraft] = useState<CreateUserDraft>(defaultDraft)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const roleOptions = useMemo(() => roles.map((item) => item.role), [roles])

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setUsers([])
      setRoles([])
      return
    }

    setError(null)
    try {
      const [nextUsers, nextRoles] = await Promise.all([getUsers(), getRolePermissions()])
      setUsers(nextUsers)
      setRoles(nextRoles)
      setRoleDraftByUserId(
        nextUsers.reduce<Record<string, string[]>>((acc, user) => {
          acc[user.id] = [...user.roles]
          return acc
        }, {}),
      )
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load user management data.')
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateRoleDraft = (userId: string, value: unknown) => {
    const rolesValue = Array.isArray(value)
      ? value.map((item) => String(item))
      : String(value)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

    setRoleDraftByUserId((previous) => ({ ...previous, [userId]: rolesValue }))
  }

  const saveUserRoles = async (userId: string) => {
    setError(null)
    setFeedback(null)
    setIsSaving(true)
    try {
      await assignUserRoles(userId, { roles: roleDraftByUserId[userId] ?? [] })
      setFeedback('User roles updated.')
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to update user roles.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const updateUserStatus = async (user: UserListItemResponse, isActive: boolean) => {
    setError(null)
    setFeedback(null)
    setIsSaving(true)
    try {
      await setUserStatus(user.id, { isActive })
      setFeedback(`User ${user.userName} ${isActive ? 'enabled' : 'disabled'}.`)
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to update user status.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const submitCreate = async () => {
    setError(null)
    setFeedback(null)
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
      setFeedback(`User ${payload.userName} created.`)
      setCreateDraft(defaultDraft)
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to create user.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. User configuration requires authentication.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>User Management</Typography>
        <Typography color="text.secondary">
          Add users, manage active status, and assign role bundles.
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 2 }}>Create User</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField
            label="Username"
            size="small"
            value={createDraft.userName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, userName: event.target.value }))}
          />
          <TextField
            label="Email"
            size="small"
            value={createDraft.email}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, email: event.target.value }))}
          />
          <TextField
            label="Password"
            size="small"
            type="password"
            value={createDraft.password}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, password: event.target.value }))}
          />
          <TextField
            label="First name"
            size="small"
            value={createDraft.firstName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, firstName: event.target.value }))}
          />
          <TextField
            label="Last name"
            size="small"
            value={createDraft.lastName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, lastName: event.target.value }))}
          />
          <TextField
            label="Roles"
            size="small"
            select
            SelectProps={{ multiple: true }}
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
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" disabled={isSaving} onClick={() => void submitCreate()}>Create user</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1.5 }}>Users</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Roles</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Stack spacing={0.4}>
                    <Typography sx={{ fontWeight: 700 }}>{user.userName}</Typography>
                    <Stack direction="row" spacing={0.75}>
                      {(roleDraftByUserId[user.id] ?? user.roles).map((role) => (
                        <Chip key={`${user.id}:${role}`} size="small" label={role} variant="outlined" />
                      ))}
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    select
                    SelectProps={{ multiple: true }}
                    value={roleDraftByUserId[user.id] ?? user.roles}
                    onChange={(event) => updateRoleDraft(user.id, event.target.value)}
                    fullWidth
                  >
                    {roleOptions.map((role) => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.isActive}
                    onChange={(event) => void updateUserStatus(user, event.target.checked)}
                    disabled={isSaving}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" disabled={isSaving} onClick={() => void saveUserRoles(user.id)}>
                    Save roles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
