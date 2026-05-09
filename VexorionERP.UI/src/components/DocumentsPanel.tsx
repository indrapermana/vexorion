import { useCallback, useEffect, useRef, useState } from 'react'
import { DescriptionRoundedIcon, DownloadRoundedIcon, FullscreenRoundedIcon, PictureAsPdfRoundedIcon, RefreshRoundedIcon, VisibilityRoundedIcon } from '@vexorion/ui'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@vexorion/ui'
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
      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Documents</Typography>
        <Typography color="text.secondary">Select a record to view its documents.</Typography>
      </Paper>
    )
  }

  const readyDocs = documents.filter((d) => d.status === 'Ready')

  return (
    <Paper elevation={0} className="panel-card">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DescriptionRoundedIcon fontSize="small" color="action" />
            <Typography variant="h6">Documents</Typography>
          </Stack>
          {canGenerate && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="doc-format-label">Format</InputLabel>
                <Select<GeneratedDocumentFormat>
                  labelId="doc-format-label"
                  label="Format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as GeneratedDocumentFormat)}
                >
                  <MenuItem value="Pdf">PDF</MenuItem>
                  <MenuItem value="Docx">DOCX</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                startIcon={isGenerating ? <CircularProgress size={14} color="inherit" /> : <DescriptionRoundedIcon fontSize="small" />}
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                Export
              </Button>
            </Stack>
          )}
        </Stack>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {feedback && <Alert severity="success" onClose={() => setFeedback(null)}>{feedback}</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : readyDocs.length === 0 ? (
          <Typography color="text.secondary" variant="body2">No documents generated yet.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readyDocs.map((doc) => {
                  const isActionLoading = actionLoadingId === doc.generatedDocumentId
                  return (
                    <TableRow key={doc.generatedDocumentId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {doc.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={formatLabel(doc.format)} size="small" color={doc.format === 'Pdf' ? 'error' : 'primary'} variant="outlined" />
                      </TableCell>
                      <TableCell>v{doc.version}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(doc.generatedAtUtc).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <ButtonGroup size="small" variant="outlined">
                          {canView && (
                            <Tooltip title={doc.format === 'Docx' ? 'Preview as PDF' : 'View inline'}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => void handleViewInline(doc)}
                                  disabled={isActionLoading}
                                  aria-label={doc.format === 'Docx' ? 'Preview as PDF' : 'View inline'}
                                >
                                  {doc.format === 'Docx' ? <PictureAsPdfRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {canDownload && (
                            <Tooltip title="Download">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => void handleDownload(doc)}
                                  disabled={isActionLoading}
                                  aria-label="Download"
                                >
                                  {isActionLoading ? <CircularProgress size={14} /> : <DownloadRoundedIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {canRegenerate && (
                            <Tooltip title="Regenerate">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => void handleRegenerate(doc)}
                                  disabled={isActionLoading}
                                  aria-label="Regenerate"
                                >
                                  {isActionLoading ? <CircularProgress size={14} /> : <RefreshRoundedIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {viewer.kind !== 'hidden' && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {viewer.kind === 'ready' ? viewer.fileName : 'Document Preview'}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {viewer.kind === 'ready' && (
                    <Tooltip title={viewer.fullscreen ? 'Exit full screen' : 'Full screen'}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setViewer((prev) =>
                            prev.kind === 'ready' ? { ...prev, fullscreen: !prev.fullscreen } : prev,
                          )
                        }
                        aria-label="Toggle full screen"
                      >
                        <FullscreenRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Button size="small" variant="text" onClick={closeViewer}>Close</Button>
                </Stack>
              </Stack>

              {viewer.kind === 'loading' && (
                <Box sx={{ display: 'grid', placeItems: 'center', height: 400 }}>
                  <CircularProgress />
                </Box>
              )}
              {viewer.kind === 'error' && <Alert severity="error">{viewer.message}</Alert>}
              {viewer.kind === 'ready' && (
                <Box
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
                </Box>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  )
}
