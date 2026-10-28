import { useCallback, useEffect, useRef, useState } from 'react'
import { DescriptionRoundedIcon, DownloadRoundedIcon, FullscreenRoundedIcon, PictureAsPdfRoundedIcon, RefreshRoundedIcon, VisibilityRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxButtonGroup, VxChip, VxCircularProgress, VxDivider, VxFormControl, VxIconButton, VxInputLabel, VxMenuItem, VxPaper, VxSelect, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTooltip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
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
  | { kind: 'error'; message: string; document: GeneratedDocumentResponse }

type RecoveryAction =
  | { kind: 'reload' }
  | { kind: 'generate' }
  | { kind: 'refresh' }
  | { kind: 'download'; document: GeneratedDocumentResponse }

function formatLabel(format: GeneratedDocumentFormat) {
  return format === 'Docx' ? 'DOCX' : 'PDF'
}

export default function DocumentsPanel({ sourceType, sourceEntityId }: DocumentsPanelProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const canView = (user?.permissions.includes('documents.view') ?? false) || (user?.permissions.includes('documents.download') ?? false)
  const canDownload = user?.permissions.includes('documents.download') ?? false
  const canGenerate = user?.permissions.includes('documents.generate') ?? false
  const canRegenerate = user?.permissions.includes('documents.regenerate') ?? false

  const [documents, setDocuments] = useState<GeneratedDocumentResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryAction, setRecoveryAction] = useState<RecoveryAction | null>(null)
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
      setRecoveryAction(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : t('pages.documentsPanel.errors.load'))
      setRecoveryAction({ kind: 'reload' })
    } finally {
      setIsLoading(false)
    }
  }, [sourceType, sourceEntityId, t])

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
    setRecoveryAction(null)
    setFeedback(null)
    try {
      await generateDocument({ sourceType, sourceEntityId, format, forceRegenerate: false })
      setFeedback(t('pages.documentsPanel.generated', { format: format === 'Docx' ? 'DOCX' : 'PDF' }))
      await loadDocuments()
    } catch (error) {
      setError(error instanceof Error ? error.message : t('pages.documentsPanel.errors.generate'))
      setRecoveryAction({ kind: 'generate' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (doc: GeneratedDocumentResponse) => {
    setActionLoadingId(doc.generatedDocumentId)
    setError(null)
    setRecoveryAction(null)
    try {
      const { downloadUrl } = await getDocumentDownloadLink(doc.generatedDocumentId)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = doc.fileName
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      setError(error instanceof Error ? error.message : t('pages.documentsPanel.errors.download'))
      setRecoveryAction({ kind: 'download', document: doc })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRegenerate = async (doc: GeneratedDocumentResponse) => {
    setActionLoadingId(doc.generatedDocumentId)
    setError(null)
    setFeedback(null)
    setRecoveryAction(null)
    try {
      await regenerateDocument(doc.generatedDocumentId)
      setFeedback(t('pages.documentsPanel.regenerated'))
      await loadDocuments()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('pages.documentsPanel.errors.regenerate')
      setError(`${message} ${t('pages.documentsPanel.regenerateRecovery')}`)
      setRecoveryAction({ kind: 'refresh' })
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
    } catch (error) {
      setViewer({ kind: 'error', message: error instanceof Error ? error.message : t('pages.documentsPanel.errors.preview'), document: doc })
    }
  }

  const handleRecovery = async () => {
    if (!recoveryAction) return
    if (recoveryAction.kind === 'generate') {
      await handleGenerate()
      return
    }
    if (recoveryAction.kind === 'download') {
      await handleDownload(recoveryAction.document)
      return
    }
    await loadDocuments()
  }

  if (!sourceEntityId) {
    return (
      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.documentsPanel.title')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.documentsPanel.selectRecord')}</VxTypography>
      </VxPaper>
    )
  }

  const isBusy = isLoading || isGenerating || actionLoadingId !== null

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack spacing={2}>
        <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DescriptionRoundedIcon fontSize="small" color="action" />
            <VxTypography component="h2" variant="h6">{t('pages.documentsPanel.title')}</VxTypography>
          </VxStack>
          {canGenerate && (
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <VxFormControl size="small" sx={{ minWidth: 100 }}>
                <VxInputLabel id="doc-format-label">{t('pages.documentsPanel.format')}</VxInputLabel>
                <VxSelect<GeneratedDocumentFormat>
                  labelId="doc-format-label"
                  label={t('pages.documentsPanel.format')}
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
                {t('pages.documentsPanel.export')}
              </VxButton>
            </VxStack>
          )}
          <VxButton
            variant="text"
            size="small"
            startIcon={isLoading ? <VxCircularProgress size={14} /> : <RefreshRoundedIcon fontSize="small" />}
            onClick={() => void loadDocuments()}
            disabled={isBusy}
          >
            {t('pages.documentsPanel.refreshHistory')}
          </VxButton>
        </VxStack>

        {error && <VxAlert severity="error" onClose={() => { setError(null); setRecoveryAction(null) }} action={recoveryAction ? <VxButton color="inherit" size="small" disabled={isBusy} onClick={() => void handleRecovery()}>{t(recoveryAction.kind === 'refresh' || recoveryAction.kind === 'reload' ? 'pages.documentsPanel.refreshHistory' : 'common.retry')}</VxButton> : undefined}>{error}</VxAlert>}
        {feedback && <VxAlert severity="success" onClose={() => setFeedback(null)}>{feedback}</VxAlert>}

        {isLoading ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <VxCircularProgress size={24} />
          </VxBox>
        ) : documents.length === 0 ? (
          <VxTypography color="text.secondary" variant="body2">{t('pages.documentsPanel.noGenerated')}</VxTypography>
        ) : (
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.documentsPanel.columns.file')}</VxTableCell>
                  <VxTableCell>{t('pages.documentsPanel.columns.format')}</VxTableCell>
                  <VxTableCell>{t('pages.documentsPanel.columns.version')}</VxTableCell>
                  <VxTableCell>{t('pages.documentsPanel.columns.status')}</VxTableCell>
                  <VxTableCell>{t('pages.documentsPanel.columns.generated')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.documentsPanel.columns.actions')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {documents.map((doc) => {
                  const isActionLoading = actionLoadingId === doc.generatedDocumentId
                  const canOpenDocument = doc.status !== 'Failed'
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
                        <VxChip
                          label={t(`pages.documentsPanel.statuses.${doc.status.toLowerCase()}`)}
                          size="small"
                          color={doc.status === 'Ready' ? 'success' : doc.status === 'Failed' ? 'error' : 'default'}
                          variant={doc.status === 'Ready' ? 'filled' : 'outlined'}
                        />
                      </VxTableCell>
                      <VxTableCell>
                        <VxTypography variant="body2" color="text.secondary">
                          {new Date(doc.generatedAtUtc).toLocaleString(i18n.resolvedLanguage)}
                        </VxTypography>
                      </VxTableCell>
                      <VxTableCell align="right">
                        <VxButtonGroup size="small" variant="outlined">
                          {canView && canOpenDocument && (
                            <VxTooltip title={t(doc.format === 'Docx' ? 'pages.documentsPanel.previewAsPdf' : 'pages.documentsPanel.viewInline')}>
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleViewInline(doc)}
                                  disabled={isActionLoading}
                                  aria-label={t(doc.format === 'Docx' ? 'pages.documentsPanel.previewAsPdfFile' : 'pages.documentsPanel.viewInlineFile', { fileName: doc.fileName })}
                                >
                                  {doc.format === 'Docx' ? <PictureAsPdfRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                </VxIconButton>
                              </span>
                            </VxTooltip>
                          )}
                          {canDownload && canOpenDocument && (
                            <VxTooltip title={t('pages.documentsPanel.download')}>
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleDownload(doc)}
                                  disabled={isActionLoading}
                                  aria-label={t('pages.documentsPanel.downloadFile', { fileName: doc.fileName })}
                                >
                                  {isActionLoading ? <VxCircularProgress size={14} /> : <DownloadRoundedIcon fontSize="small" />}
                                </VxIconButton>
                              </span>
                            </VxTooltip>
                          )}
                          {canRegenerate && doc.status === 'Ready' && (
                            <VxTooltip title={t('pages.documentsPanel.regenerate')}>
                              <span>
                                <VxIconButton
                                  size="small"
                                  onClick={() => void handleRegenerate(doc)}
                                  disabled={isActionLoading}
                                  aria-label={t('pages.documentsPanel.regenerateFile', { fileName: doc.fileName })}
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
                  {viewer.kind === 'ready' ? viewer.fileName : t('pages.documentsPanel.previewTitle')}
                </VxTypography>
                <VxStack direction="row" spacing={0.5}>
                  {viewer.kind === 'ready' && (
                    <VxTooltip title={t(viewer.fullscreen ? 'pages.documentsPanel.exitFullScreen' : 'pages.documentsPanel.fullScreen')}>
                      <VxIconButton
                        size="small"
                        onClick={() =>
                          setViewer((prev) =>
                            prev.kind === 'ready' ? { ...prev, fullscreen: !prev.fullscreen } : prev,
                          )
                        }
                        aria-label={t('pages.documentsPanel.toggleFullScreen')}
                      >
                        <FullscreenRoundedIcon fontSize="small" />
                      </VxIconButton>
                    </VxTooltip>
                  )}
                  <VxButton size="small" variant="text" onClick={closeViewer}>{t('pages.documentsPanel.close')}</VxButton>
                </VxStack>
              </VxStack>

              {viewer.kind === 'loading' && (
                <VxBox sx={{ display: 'grid', placeItems: 'center', height: 400 }}>
                  <VxCircularProgress />
                </VxBox>
              )}
              {viewer.kind === 'error' && <VxAlert severity="error" action={<VxButton color="inherit" size="small" onClick={() => void handleViewInline(viewer.document)}>{t('common.retry')}</VxButton>}>{viewer.message}</VxAlert>}
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
                    title={t('pages.documentsPanel.previewTitle')}
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
