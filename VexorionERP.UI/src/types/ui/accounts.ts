import type { AccountDetailsResponse, AccountListItemResponse } from '../api'

export const accountTypeOptions = [
  { value: 1, label: 'Asset' },
  { value: 2, label: 'Liability' },
  { value: 3, label: 'Equity' },
  { value: 4, label: 'Revenue' },
  { value: 5, label: 'Expense' },
] as const

export const normalBalanceOptions = [
  { value: 1, label: 'Debit' },
  { value: 2, label: 'Credit' },
] as const

export function getAccountTypeLabel(value: number) {
  return accountTypeOptions.find((x) => x.value === value)?.label ?? `Type ${value}`
}

export function getNormalBalanceLabel(value: number) {
  return normalBalanceOptions.find((x) => x.value === value)?.label ?? `Balance ${value}`
}

export type AccountGridRow = AccountListItemResponse

export type AccountFormValues = {
  code: string
  name: string
  accountType: number
  normalBalance: number
  isPostingAllowed: boolean
  isActive: boolean
  description: string
}

export type AccountEditorDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  accountId?: string | null
  onClose: () => void
  onSaved: (account: AccountDetailsResponse, mode: 'create' | 'edit') => void
}
