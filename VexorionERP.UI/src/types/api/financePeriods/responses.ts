export type FiscalPeriodListItemResponse = {
  id: string
  periodCode: string
  startDate: string
  endDate: string
  isClosed: boolean
}

export type FiscalPeriodDetailsResponse = FiscalPeriodListItemResponse & {
  closedAtUtc?: string | null
}
