export type PostSalesInvoiceRequest = {
  receivableAccountId: string
  revenueAccountId: string
  taxLiabilityAccountId?: string | null
  postingDate: string
}

export type PostPurchaseInvoiceRequest = {
  payableAccountId: string
  expenseAccountId: string
  taxReceivableAccountId?: string | null
  postingDate: string
}

export type ReverseJournalRequest = {
  reversalDate: string
}

export type CreateManualJournalLineRequest = {
  accountId: string
  description?: string | null
  debitAmount: number
  creditAmount: number
}

export type CreateManualJournalRequest = {
  postingDate: string
  description: string
  lines: CreateManualJournalLineRequest[]
}
