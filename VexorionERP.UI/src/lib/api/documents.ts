import type { GenerateDocumentRequest, GeneratedDocumentResponse, GeneratedDocumentSourceType, GetDocumentDownloadLinkResponse } from '../../types/api'
import { apiClient, requestJson } from './core'

export function listGeneratedDocuments(sourceType: GeneratedDocumentSourceType, sourceEntityId: string) {
  return requestJson<GeneratedDocumentResponse[]>(`/documents/source/${sourceType}/${sourceEntityId}`)
}

export function generateDocument(request: GenerateDocumentRequest) {
  return requestJson<GeneratedDocumentResponse>('/documents/generate', 'POST', request)
}

export function getDocumentDownloadLink(generatedDocumentId: string) {
  return requestJson<GetDocumentDownloadLinkResponse>(`/documents/${generatedDocumentId}/download-link`)
}

export function regenerateDocument(generatedDocumentId: string) {
  return requestJson<GeneratedDocumentResponse>(`/documents/${generatedDocumentId}/regenerate`, 'POST')
}

export function getDocumentPdfPreviewUrl(generatedDocumentId: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
  return `${baseUrl}/documents/${generatedDocumentId}/preview/pdf`
}

export async function fetchDocumentPdfPreviewBlob(generatedDocumentId: string): Promise<string> {
  const response = await apiClient.get<Blob>(`/documents/${generatedDocumentId}/preview/pdf`, {
    responseType: 'blob',
  })
  return URL.createObjectURL(response.data)
}

export async function fetchDocumentInlineBlob(generatedDocumentId: string): Promise<string> {
  const response = await apiClient.get<Blob>(`/documents/${generatedDocumentId}/inline`, {
    responseType: 'blob',
  })
  return URL.createObjectURL(response.data)
}
