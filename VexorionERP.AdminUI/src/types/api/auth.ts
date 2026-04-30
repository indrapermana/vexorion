export type AuthLoginRequest = {
  tenantCode: string
  userNameOrEmail: string
  password: string
}

export type AuthSessionResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type CurrentUserResponse = {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  roles: string[]
}

export type ValidationProblem = {
  [key: string]: string[] | string
}
