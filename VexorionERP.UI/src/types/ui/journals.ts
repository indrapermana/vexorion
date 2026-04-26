import type { JournalEntryDetailsResponse, JournalEntryListItemResponse } from '../api'

export type JournalGridRow = JournalEntryListItemResponse

export type JournalPostingSalesValues = {
  salesInvoiceId: string
  receivableAccountId: string
  revenueAccountId: string
  taxLiabilityAccountId: string
  postingDate: string
}

export type JournalPostingPurchaseValues = {
  purchaseInvoiceId: string
  payableAccountId: string
  expenseAccountId: string
  taxReceivableAccountId: string
  postingDate: string
}

export type JournalReverseValues = {
  journalEntryId: string
  reversalDate: string
}

export type JournalSelection = JournalEntryDetailsResponse | null
