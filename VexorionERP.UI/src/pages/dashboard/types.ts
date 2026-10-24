export type CashRowView = {
  id: string
  owner: string
  status: string
  amount: string
}

export type CashFlowPoint = {
  day: number
  inflow: number
  outflow: number
}

export type BalancePoint = {
  name: string
  open: number
  overdue: number
}

export type AgingPoint = {
  name: string
  value: number
}

export type QuickStat = {
  label: string
  value: string
  description: string
}

export type TopCustomerView = {
  id: string
  rank: number
  customerLabel: string
  orderReference: string
  amount: number
}

export type RecentOrderView = {
  id: string
  orderReference: string
  customerLabel: string
  orderDateLabel: string
  status: number
  statusLabel: string
  amount: number
}
