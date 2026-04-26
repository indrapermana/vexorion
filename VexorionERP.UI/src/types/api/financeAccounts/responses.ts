export type AccountListItemResponse = {
  id: string
  code: string
  name: string
  accountType: number
  normalBalance: number
  isPostingAllowed: boolean
  isActive: boolean
}

export type AccountDetailsResponse = AccountListItemResponse & {
  description?: string | null
}
