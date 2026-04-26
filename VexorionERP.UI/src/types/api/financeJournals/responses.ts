export type JournalEntryLineResponse = {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  lineNumber: number
  description?: string | null
  debitAmount: number
  creditAmount: number
}

export type JournalEntryListItemResponse = {
  id: string
  journalNumber: string
  sourceDocumentType: string
  sourceDocumentId?: string | null
  postingDate: string
  status: number
  totalDebit: number
  totalCredit: number
}

export type JournalEntryDetailsResponse = JournalEntryListItemResponse & {
  fiscalPeriodId: string
  reversedJournalEntryId?: string | null
  description?: string | null
  lines: JournalEntryLineResponse[]
}
