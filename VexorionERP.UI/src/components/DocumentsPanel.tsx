import { useCallback, useEffect, useRef, useState } from 'react'
import { DescriptionRoundedIcon, DownloadRoundedIcon, FullscreenRoundedIcon, PictureAsPdfRoundedIcon, RefreshRoundedIcon, VisibilityRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxButtonGroup, VxChip, VxCircularProgress, VxDivider, VxFormControl, VxIconButton, VxInputLabel, VxMenuItem, VxPaper, VxSelect, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTooltip, VxTypography } from '@vexorion/ui'
import { useAuth } from '../app/AuthContext'
import {
  fetchDocumentInlineBlob,
  fetchDocumentPdfPreviewBlob,
  generateDocument,
  getDocumentDownloadLink,
  listGeneratedDocuments,
  regenerateDocument,
} from '../lib/api'
import type { GeneratedDocumentFormat, GeneratedDocumentResponse, GeneratedDocumentSourceType } from '../types/api'

type DocumentsPanelProps = {
  sourceType: GeneratedDocumentSourceType
  sourceEntityId: string | null
}

type ViewerState =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'ready'; objectUrl: string; fileName: string; fullscreen: boolean }
  | { kind: 'error'; message: string }

function formatLabel(format: GeneratedDocumentFormat) {
  return format === 'Docx' ? 'DOCX' : 'PDF'
}

export default function DocumentsPanel({ sourceType, sourceEntityId }: DocumentsPanelProps) {
  const { user } = useAuth()
  const canView = (user?.permissions.includes('documents.view') ?? false) || (user?.permissions.includes('documents.download') ?? false)
  const canDownload = user?.permissions.includes('documents.download') ?? false
  const canGenerate = user?.permissions.includes('documents.generate') ?? false
  const canRegenerate = user?.permissions.includes('documents.regenerate') ?? false

  const [documents, setDocuments] = useState<GeneratedDocumentResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [format, setFormat] = useState<GeneratedDocumentFormat>('Pdf')
  const [isGenerating, setIsGenerating] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ViewerState>({ kind: 'hidden' })
  const prevObjectUrl = useRef<string | null>(null)

  const closeViewer = useCallback(() => {
    if (prevObjectUrl.current) {
      URL.revokeObjectURL(prevObjectUrl.current)
      prevObjectUrl.current = null
    }
    setViewer({ kind: 'hidden' })
  }, [])

  const loadDocuments = useCallback(async () => {
    if (!sourceEntityId) return
    setIsLoading(true)
    setError(null)
    try {
      const docs = await listGeneratedDocuments(sourceType, sourceEntityId)
      setDocuments(docs)
    } catch {
      setError('Failed to load document history.')
    } finally {
      setIsLoading(false)
    }
  }, [sourceType, sourceEntityId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  // Revoke previous object URL when viewer changes
  useEffect(() => {
    if (viewer.kind === 'ready') {
      const prev = prevObjectUrl.current
      prevObjectUrl.current = viewer.objectUrl
      if (prev && prev !== viewer.objectUrl) {
        URL.revokeObjectURL(prev)
      }
    }
  }, [viewer])

  const handleGenerate = async () => {
    if (!sourceEntityId) return
    setIsGenerating(true)
    setError(null)
    setFeedback(null)
    try {
      await generateDocument({ sourceType, sourceEntityId, format, forceRegenerate: false })
      setFeedback(`${formatLabel(format)} document generated.`)
      await loadDocuments()
    } catch {
      setError('Failed to generate document.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (doc: GeneratedDocumentResponse) => {
    setActionLoadingId(doc.generatedDocumentId)
    setError(null)
    try {
      const { downloadUrl } = await getDocumentDownloadLink(doc.generatedDocumentId)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = doc.fileName
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setError('Failed to get download link.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRegenerate = async (doc: GeneratedDocumentResponse) => {
    setActionLoadingId(doc.generatedDocumentId)
    setError(null)
    setFeedback(null)
    try {
      await regenerateDocument(doc.generatedDocumentId)
      setFeedback('Document regenerated.')
      await loadDocuments()
    } catch {
      setError('Failed to regenerate document.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleViewInline = async (doc: GeneratedDocumentResponse) => {
    closeViewer()
    setViewer({ kind: 'loading' })
    try {
      let objectUrl: string
      if (doc.format === 'Docx') {
        objectUrl = await fetchDocumentPdfPreviewBlob(doc.generatedDocumentId)
      } else {
        objectUrl = await fetchDocumentInlineBlob(doc.generatedDocumentId)
      }
      setViewer({ kind: 'ready', objectUrl, fileName: doc.fileName, fullscreen: false })
    } catch {
      setViewer({ kind: 'error', message: 'Failed to load document preview.' })
    }
  }

  if (!sourceEntityId) {
    return (
      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>Documents</VxTypography>
        <VxTypography color="text.secondary">VxSelect a record to view its documents.</VxTypography>
      </VxPaper>
    )
  }

  const readyDocs = documents.filter((d) => d.status === 'Ready')

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack spacing={2}>
        <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DescriptionRoundedIcon fontSize="small" color="action" />
            <VxTypography variant="h6">Documents</VxTypography>
          </VxStack>
          {canGenerate && (
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <VxFormControl size="small" sx={{ minWidth: 100 }}>
                <VxInputLabel id="doc-format-label">Format</VxInputLabel>
                <VxSelect<GeneratedDocumentFormat>
                  labelId="doc-format-label"
                  label="Format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as GeneratedDocumentFormat)}
                >
                  <VxMenuItem value="Pdf">PDF</VxMenuItem>
                  <VxMenuItem value="Docx">DOCX</VxMenuItem>
                </VxSelect>
              </VxFormControl>
              <VxButton
                variant="contained"
                size="small"
                startIcon={isGenerating ? <VxCircularProgress size={14} color="inherit" /> : <DescriptionRoundedIcon fontSize="small" />}
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                Export
              </VxButton>
            </VxStack>
          )}
        </VxStack>

        {error && <VxAlert severity="error" onClose={() => setError(null)}>{error}</VxAlert>}
        {feedback && <VxAlert severity="success" onClose={() => setFeedback(null)}>{feedback}</VxAlert>}

        {isLoading ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <VxCircularProgress size={24} />
          </VxBox>
        ) : readyDocs.length === 0 ? (
          <VxTypography color="text.secondary" variant="body2">No documents generated yet.</VxTypography>
        ) : (
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>File</VxTableCell>
                  <VxTableCell>Format</VxTableCell>
                  <VxTableCell>Version</VxTableCell>
                  <VxTableCell>Generated</VxTableCell>
                  <VxTableCell align="right">Actions</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {readyDocs.map((doc) => {
                  const isActionLoading = actionLoadingId === doc.generatedDocumentId
                  return (
                    <VxTableRow key={doc.generatedDocumentId} hover>
                      <VxTableCell>
                        <VxTypography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {doc.fileName}
                        </VxTypography>
                      </VxTableCell>
                      <VxTableCell>
                        <VxChip label={formatLabel(doc.format)} size="small" color={doc.format === 'Pdf' ? 'error' : 'primary'} variant="outlined" />
                      </VxTableCell>
                      <VxTableCell>v{doc.version}</VxTableCell>
                      <VxTableCell>
                        <VxTypography variant="body2" color="text.secondary">
                          {new Date(doc.generatedAtUtc).toLocaleString()}
                        </VxTypography>
                      </VxTableCell>
                      <VxTableCell align="right">
                        <VxButtonGroup size="small" variant="outlined">
                          {canView && (
                            <VxTooltip title={doc.format === 'Docx' ? 'Preview as PDF' : 'View inline'}>
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleViewInline(doc)}
                                  disabled={isActionLoading}
                                  aria-label={doc.format === 'Docx' ? 'Preview as PDF' : 'View inline'}
                                >
                                  {doc.format === 'Docx' ? <PictureAsPdfRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                </VxIconButton>
                              </span>
                            </VxTooltip>
                          )}
                          {canDownload && (
                            <VxTooltip title="Download">
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleDownload(doc)}
                                  disabled={isActionLoading}
                                  aria-label="Download"
                                >
                                  {isActionLoading ? <VxCircularProgress size={14} /> : <DownloadRoundedIcon fontSize="small" />}
                                </VxIconButton>
                              </span>
                            </VxTooltip>
                          )}
                          {canRegenerate && (
                            <VxTooltip title="Regenerate">
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleRegenerate(doc)}
                                  disabled={isActionLoading}
                                  aria-label="Regenerate"
                                >
                                  {isActionLoading ? <VxCircularProgress size={14} /> : <RefreshRoundedIcon fontSize="small" />}
                                </VxIconButton>
                              </span>
                            </VxTooltip>
                          )}
                        </VxButtonGroup>
                      </VxTableCell>
                    </VxTableRow>
                  )
                })}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        )}

        {viewer.kind !== 'hidden' && (
          <>
            <VxDivider />
            <VxStack spacing={1}>
              <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <VxTypography variant="subtitle2" color="text.secondary">
                  {viewer.kind === 'ready' ? viewer.fileName : 'Document Preview'}
                </VxTypography>
                <VxStack direction="row" spacing={0.5}>
                  {viewer.kind === 'ready' && (
                    <VxTooltip title={viewer.fullscreen ? 'Exit full screen' : 'Full screen'}>
                      <VxIconButton
                        size="small"
                        onClick={() =>
                          setViewer((prev) =>
                            prev.kind === 'ready' ? { ...prev, fullscreen: !prev.fullscreen } : prev,
                          )
                        }
                        aria-label="Toggle full screen"
                      >
                        <FullscreenRoundedIcon fontSize="small" />
                      </VxIconButton>
                    </VxTooltip>
                  )}
                  <VxButton size="small" variant="text" onClick={closeViewer}>Close</VxButton>
                </VxStack>
              </VxStack>

              {viewer.kind === 'loading' && (
                <VxBox sx={{ display: 'grid', placeItems: 'center', height: 400 }}>
                  <VxCircularProgress />
                </VxBox>
              )}
              {viewer.kind === 'error' && <VxAlert severity="error">{viewer.message}</VxAlert>}
              {viewer.kind === 'ready' && (
                <VxBox
                  sx={{
                    position: viewer.fullscreen ? 'fixed' : 'relative',
                    inset: viewer.fullscreen ? 0 : undefined,
                    zIndex: viewer.fullscreen ? 1300 : undefined,
                    bgcolor: 'background.paper',
                    height: viewer.fullscreen ? '100dvh' : 600,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <iframe
                    src={viewer.objectUrl}
                    title="Document Preview"
                    style={{ flex: 1, border: 'none', width: '100%' }}
                  />
                </VxBox>
              )}
            </VxStack>
          </>
        )}
      </VxStack>
    </VxPaper>
  )
}
