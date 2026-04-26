import type { FiscalPeriodDetailsResponse, FiscalPeriodListItemResponse } from '../api'

export type FiscalPeriodGridRow = FiscalPeriodListItemResponse

export type FiscalPeriodFormValues = {
  periodCode: string
  startDate: string
  endDate: string
  isClosed: boolean
}

export type FiscalPeriodEditorDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  fiscalPeriodId?: string | null
  onClose: () => void
  onSaved: (period: FiscalPeriodDetailsResponse, mode: 'create' | 'edit') => void
}
