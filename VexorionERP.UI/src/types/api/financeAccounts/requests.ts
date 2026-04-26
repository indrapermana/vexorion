export type CreateAccountRequest = {
  code: string
  name: string
  accountType: number
  normalBalance: number
  isPostingAllowed: boolean
  isActive: boolean
  description?: string | null
}

export type UpdateAccountRequest = {
  code: string
  name: string
  accountType: number
  normalBalance: number
  isPostingAllowed: boolean
  isActive: boolean
  description?: string | null
}
