export type AvailableImportTypeResponse = {
  importType: string
  columns: string[]
}

export type ImportTemplateResponse = {
  importType: string
  fileName: string
  contentType: string
  content: string // base64 encoded bytes from backend
}

export type ImportValidationErrorResponse = {
  rowNumber: number
  columnName: string
  category: string
  message: string
}

export type ImportValidationResultResponse = {
  importJobId: string
  importType: string
  status: number
  totalRows: number
  validRows: number
  invalidRows: number
  errorWorkbookFileName?: string | null
  errorWorkbookContentType?: string | null
  errorWorkbookContent?: string | null // base64
  errors: ImportValidationErrorResponse[]
}

export type ImportJobStatusResponse = {
  importJobId: string
  importType: string
  status: number
  totalRows: number
  validRows: number
  invalidRows: number
  validatedAtUtc?: string | null
  submittedAtUtc?: string | null
  completedAtUtc?: string | null
  errorSummary?: string | null
}

export type ImportJobHistoryItemResponse = {
  importJobId: string
  importType: string
  sourceFileName: string
  status: number
  totalRows: number
  validRows: number
  invalidRows: number
  requestedByUserId: string
  validatedAtUtc?: string | null
  submittedAtUtc?: string | null
  completedAtUtc?: string | null
  errorSummary?: string | null
}
