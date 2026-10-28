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
  sheetName?: string
  rowNumber: number
  columnReference?: string
  columnName: string
  fieldName?: string
  category: string
  message: string
  cause?: string
  suggestedAction?: string
  retryAction?: string
}

export type ImportValidationResultResponse = {
  importJobId: string
  importType: string
  sourceFileName: string
  status: number
  totalRows: number
  validRows: number
  invalidRows: number
  errorWorkbookFileName?: string | null
  errorWorkbookContentType?: string | null
  errorWorkbookContent?: string | null // base64
  errors: ImportValidationErrorResponse[]
  previewHeaders: string[]
  previewRows: ImportPreviewRowResponse[]
}

export type ImportPreviewRowResponse = {
  rowNumber: number
  values: Record<string, string>
}

export type ValidateImportRowsRequest = {
  importType: string
  fileName: string
  headers: string[]
  rows: ImportPreviewRowResponse[]
}

export type ImportJobStatusResponse = {
  importJobId: string
  importType: string
  sourceFileName: string
  status: number
  totalRows: number
  validRows: number
  invalidRows: number
  validatedAtUtc?: string | null
  submittedAtUtc?: string | null
  completedAtUtc?: string | null
  errorSummary?: string | null
  previewHeaders?: string[]
  previewRows?: ImportPreviewRowResponse[]
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
