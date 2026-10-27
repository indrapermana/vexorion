import type {
  AvailableImportTypeResponse,
  ImportJobHistoryItemResponse,
  ImportJobStatusResponse,
  ImportValidationResultResponse,
  ValidateImportRowsRequest,
} from '../../types/api'
import { apiClient, requestJson } from './core'

export function getAvailableImportTypes() {
  return requestJson<AvailableImportTypeResponse[]>('/imports/types')
}

export async function downloadImportTemplate(importType: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/imports/template/${encodeURIComponent(importType)}`, {
    responseType: 'blob',
  })

  const contentDisposition = response.headers['content-disposition'] as string | undefined
  let fileName = `${importType}-template.xlsx`
  if (contentDisposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
    if (match?.[1]) {
      fileName = match[1].replace(/['"]/g, '')
    }
  }

  const url = URL.createObjectURL(response.data as Blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function validateImportFile(importType: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('importType', importType)

  const response = await apiClient.post<ImportValidationResultResponse>('/imports/validate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export function validateImportRows(request: ValidateImportRowsRequest) {
  return requestJson<ImportValidationResultResponse>('/imports/validate-rows', 'POST', request)
}

export function submitImportJob(importJobId: string) {
  return requestJson<ImportJobStatusResponse>(`/imports/${encodeURIComponent(importJobId)}/submit`, 'POST')
}

export function getImportJobStatus(importJobId: string) {
  return requestJson<ImportJobStatusResponse>(`/imports/${encodeURIComponent(importJobId)}/status`)
}

export async function downloadErrorWorkbook(importJobId: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/imports/${encodeURIComponent(importJobId)}/errors`, {
    responseType: 'blob',
  })

  const contentDisposition = response.headers['content-disposition'] as string | undefined
  let fileName = `${importJobId}-errors.xlsx`
  if (contentDisposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
    if (match?.[1]) {
      fileName = match[1].replace(/['"]/g, '')
    }
  }

  const url = URL.createObjectURL(response.data as Blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function getImportHistory(importType: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    importType,
    page: String(page),
    pageSize: String(pageSize),
  })
  return requestJson<ImportJobHistoryItemResponse[]>(`/imports/history?${params.toString()}`)
}
