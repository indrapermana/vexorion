import type { AuthLoginRequest, AuthSessionResponse, CurrentUserResponse, ValidationProblem } from '../api'

export type AuthState = {
  session: AuthSessionResponse | null
  user: CurrentUserResponse | null
  isLoading: boolean
  error: string | null
  validation: ValidationProblem | null
  initialize: () => Promise<void>
  login: (request: AuthLoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearFeedback: () => void
}
