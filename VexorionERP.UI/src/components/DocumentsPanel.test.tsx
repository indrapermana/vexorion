import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsPanel from './DocumentsPanel'
import type { GeneratedDocumentResponse } from '../types/api'

const api = vi.hoisted(() => ({
  fetchDocumentInlineBlob: vi.fn(),
  fetchDocumentPdfPreviewBlob: vi.fn(),
  generateDocument: vi.fn(),
  getDocumentDownloadLink: vi.fn(),
  listGeneratedDocuments: vi.fn(),
  regenerateDocument: vi.fn(),
}))

vi.mock('../lib/api', () => api)
vi.mock('../app/AuthContext', () => ({
  useAuth: () => ({
    user: { permissions: ['documents.view', 'documents.download', 'documents.generate', 'documents.regenerate'] },
  }),
}))
vi.mock('react-i18next', () => {
  const t = (key: string, values?: Record<string, string>) => values?.fileName ? `${key}: ${values.fileName}` : key
  return {
    useTranslation: () => ({
      i18n: { resolvedLanguage: 'enUS' },
      t,
    }),
  }
})

function documentVersion(
  generatedDocumentId: string,
  version: number,
  status: GeneratedDocumentResponse['status'],
): GeneratedDocumentResponse {
  return {
    generatedDocumentId,
    sourceType: 'SalesInvoice',
    sourceEntityId: 'invoice-1',
    format: 'Pdf',
    status,
    version,
    fileName: `invoice-v${version}.pdf`,
    contentType: 'application/pdf',
    blobPath: `documents/invoice-v${version}.pdf`,
    downloadUrl: null,
    generatedAtUtc: `2026-10-${20 + version}T10:00:00Z`,
  }
}

describe('DocumentsPanel generated-document workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listGeneratedDocuments.mockResolvedValue([])
  })

  it('keeps prior and failed versions in history while limiting regeneration to the current version', async () => {
    api.listGeneratedDocuments.mockResolvedValue([
      documentVersion('document-3', 3, 'Ready'),
      documentVersion('document-2', 2, 'Superseded'),
      documentVersion('document-1', 1, 'Failed'),
    ])

    render(<DocumentsPanel sourceType="SalesInvoice" sourceEntityId="invoice-1" />)

    expect(await screen.findByText('invoice-v3.pdf')).toBeInTheDocument()
    expect(screen.getByText('invoice-v2.pdf')).toBeInTheDocument()
    expect(screen.getByText('invoice-v1.pdf')).toBeInTheDocument()
    expect(screen.getByText('pages.documentsPanel.statuses.ready')).toBeInTheDocument()
    expect(screen.getByText('pages.documentsPanel.statuses.superseded')).toBeInTheDocument()
    expect(screen.getByText('pages.documentsPanel.statuses.failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pages.documentsPanel.viewInlineFile: invoice-v2.pdf' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'pages.documentsPanel.viewInlineFile: invoice-v1.pdf' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /pages\.documentsPanel\.regenerateFile/ })).toHaveLength(1)
  })

  it('retries a failed history load from the recovery action', async () => {
    api.listGeneratedDocuments
      .mockRejectedValueOnce(new Error('History is temporarily unavailable.'))
      .mockResolvedValueOnce([documentVersion('document-1', 1, 'Ready')])

    render(<DocumentsPanel sourceType="SalesInvoice" sourceEntityId="invoice-1" />)

    expect(await screen.findByText('History is temporarily unavailable.')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'pages.documentsPanel.refreshHistory' })[0])

    expect(await screen.findByText('invoice-v1.pdf')).toBeInTheDocument()
    expect(api.listGeneratedDocuments).toHaveBeenCalledTimes(2)
  })

  it('reconciles history instead of blindly retrying an uncertain regeneration', async () => {
    api.listGeneratedDocuments.mockResolvedValue([documentVersion('document-1', 1, 'Ready')])
    api.regenerateDocument.mockRejectedValue(new Error('The response was interrupted.'))

    render(<DocumentsPanel sourceType="SalesInvoice" sourceEntityId="invoice-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'pages.documentsPanel.regenerateFile: invoice-v1.pdf' }))
    expect(await screen.findByText(/The response was interrupted/)).toHaveTextContent('pages.documentsPanel.regenerateRecovery')

    const refreshButtons = screen.getAllByRole('button', { name: 'pages.documentsPanel.refreshHistory' })
    fireEvent.click(refreshButtons[0])

    await waitFor(() => expect(api.listGeneratedDocuments).toHaveBeenCalledTimes(2))
    expect(api.regenerateDocument).toHaveBeenCalledTimes(1)
  })
})
