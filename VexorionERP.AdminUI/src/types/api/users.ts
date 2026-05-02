export type UserListItemResponse = {
  id: string
  tenantId: string
  userName: string
  email: string
  firstName?: string | null
  lastName?: string | null
  isActive: boolean
  roles: string[]
}

export type CreateUserRequest = {
  userName: string
  email: string
  password: string
  firstName?: string | null
  lastName?: string | null
  employeeId?: string | null
  roles: string[]
}

export type DisableUserRequest = {
  isActive: boolean
}

export type ResetPasswordRequest = {
  newPassword: string
}
