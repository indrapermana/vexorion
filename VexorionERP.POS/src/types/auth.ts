import type { CurrentUserResponse, LoginRequest, LoginResponse, ValidationProblem } from './api'

export type AuthState = {
  session: LoginResponse | null
  user: CurrentUserResponse | null
  isLoading: boolean
  error: string | null
  validation: ValidationProblem | null
  initialize: () => Promise<void>
  login: (request: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearFeedback: () => void
}
