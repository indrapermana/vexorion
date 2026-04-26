export type CreateFiscalPeriodRequest = {
  periodCode: string
  startDate: string
  endDate: string
  isClosed: boolean
}

export type UpdateFiscalPeriodRequest = {
  periodCode: string
  startDate: string
  endDate: string
  isClosed: boolean
}
