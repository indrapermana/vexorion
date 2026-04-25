export type LoginResponse = {
  accessToken: string
  expiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
}

export type CurrentUserResponse = {
  id: string
  tenantId: string
  userName: string
  email: string
  firstName?: string | null
  lastName?: string | null
  roles: string[]
  permissions: string[]
}