import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadImportTemplate,
  getAvailableImportTypes,
  submitImportJob,
  validateImportFile,
} from '../../../lib/api'
import ImportHistoryPanel from '../components/ImportHistoryPanel'
import type {
  AvailableImportTypeResponse,
  ImportJobStatusResponse,
  ImportValidationResultResponse,
} from '../../../types/api'

type FlowState =
  | { phase: 'idle' }
  | { phase: 'downloading' }
  | { phase: 'validating' }
  | { phase: 'validated'; result: ImportValidationResultResponse }
  | { phase: 'submitting'; result: ImportValidationResultResponse }
  | { phase: 'submitted'; jobStatus: ImportJobStatusResponse }
  | { phase: 'error'; message: string }

// Known import types for the tabs — used when backend list is not yet loaded
const defaultImportTypes: AvailableImportTypeResponse[] = [
  { importType: 'Customer', columns: [] },
  { importType: 'Supplier', columns: [] },
  { importType: 'Product', columns: [] },
  { importType: 'SalesOrder', columns: [] },
  { importType: 'PurchaseOrder', columns: [] },
]

function getJobStatusLabel(status: number): string {
  switch (status) {
    case 1: return 'Pending'
    case 2: return 'Validated'
    case 3: return 'Submitted'
    case 4: return 'Processing'
    case 5: return 'Completed'
    case 6: return 'Failed'
    default: return String(status)
  }
}

function downloadBase64File(base64Content: string, fileName: string, contentType: string) {
  const bytes = atob(base64Content)
  const buffer = new Uint8Array(bytes.length)

  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i)
  }

  const blob = new Blob([buffer], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

interface ImportFlowPanelProps {
  importType: string
  onSubmitted?: () => void
}

function ImportFlowPanel({ importType, onSubmitted }: ImportFlowPanelProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [flow, setFlow] = useState<FlowState>({ phase: 'idle' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const reset = () => {
    setFlow({ phase: 'idle' })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = async () => {
    setFlow({ phase: 'downloading' })
    try {
      await downloadImportTemplate(importType)
      setFlow({ phase: 'idle' })
    } catch {
      setFlow({ phase: 'error', message: t('config.importData.errors.downloadTemplate') })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    if (flow.phase === 'error' || flow.phase === 'validated' || flow.phase === 'submitted') {
      setFlow({ phase: 'idle' })
    }
  }

  const handleValidate = async () => {
    if (!selectedFile) return
    setFlow({ phase: 'validating' })
    try {
      const result = await validateImportFile(importType, selectedFile)
      setFlow({ phase: 'validated', result })
    } catch {
      setFlow({ phase: 'error', message: t('config.importData.errors.validate') })
    }
  }

  const handleSubmit = async () => {
    if (flow.phase !== 'validated') return
    const { result } = flow
    if (result.invalidRows > 0 && result.validRows === 0) return
    setFlow({ phase: 'submitting', result })
    try {
      const jobStatus = await submitImportJob(result.importJobId)
      setFlow({ phase: 'submitted', jobStatus })
      onSubmitted?.()
    } catch {
      setFlow({ phase: 'error', message: t('config.importData.errors.submit') })
    }
  }

  const isValidated = flow.phase === 'validated'
  const validationResult = isValidated ? flow.result : flow.phase === 'submitting' ? flow.result : null
  const isValid = validationResult ? validationResult.invalidRows === 0 : false

  const handleDownloadErrorWorkbook = () => {
    if (!validationResult?.errorWorkbookContent) return

    downloadBase64File(
      validationResult.errorWorkbookContent,
      validationResult.errorWorkbookFileName ?? `${importType}-validation-errors.xlsx`,
      validationResult.errorWorkbookContentType
        ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  }

  return (
    <Stack spacing={3}>
      {/* Step 1: Download Template */}
      <Paper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <DownloadRoundedIcon color="action" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('config.importData.steps.downloadTemplate')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('config.importData.steps.downloadTemplateDesc')}
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={flow.phase === 'downloading' ? <CircularProgress size={16} /> : <DownloadRoundedIcon />}
              onClick={handleDownloadTemplate}
              disabled={flow.phase === 'downloading' || flow.phase === 'validating' || flow.phase === 'submitting'}
              size="small"
            >
              {flow.phase === 'downloading' ? t('config.importData.downloading') : t('config.importData.downloadTemplate')}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Divider />

      {/* Step 2: Upload File */}
      <Paper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CloudUploadRoundedIcon color="action" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('config.importData.steps.uploadFile')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('config.importData.steps.uploadFileDesc')}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id={`file-input-${importType}`}
            />
            <label htmlFor={`file-input-${importType}`}>
              <Button
                component="span"
                variant="outlined"
                startIcon={<FileUploadRoundedIcon />}
                size="small"
                disabled={flow.phase === 'validating' || flow.phase === 'submitting'}
              >
                {t('config.importData.chooseFile')}
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {selectedFile.name}
              </Typography>
            )}
          </Stack>
          {selectedFile && (
            <Box>
              <Button
                variant="contained"
                startIcon={flow.phase === 'validating' ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineRoundedIcon />}
                onClick={handleValidate}
                disabled={flow.phase === 'validating' || flow.phase === 'submitting'}
                size="small"
              >
                {flow.phase === 'validating' ? t('config.importData.validating') : t('config.importData.validate')}
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Validation Result */}
      {validationResult && (
        <>
          <Divider />
          <Paper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {isValid
                  ? <CheckCircleOutlineRoundedIcon color="success" />
                  : <ErrorOutlineRoundedIcon color="error" />}
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('config.importData.steps.validationResult')}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <Chip
                  label={`${t('config.importData.totalRows')}: ${validationResult.totalRows}`}
                  size="small"
                />
                <Chip
                  color="success"
                  label={`${t('config.importData.validRows')}: ${validationResult.validRows}`}
                  size="small"
                />
                {validationResult.invalidRows > 0 && (
                  <Chip
                    color="error"
                    label={`${t('config.importData.invalidRows')}: ${validationResult.invalidRows}`}
                    size="small"
                  />
                )}
              </Stack>

              {isValid && (
                <Alert severity="success">{t('config.importData.allRowsValid')}</Alert>
              )}

              {!isValid && validationResult.errors.length > 0 && (
                <Stack spacing={1.5}>
                  {validationResult.errorWorkbookContent && (
                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={handleDownloadErrorWorkbook}
                        size="small"
                      >
                        {t('config.importData.downloadErrorWorkbook')}
                      </Button>
                    </Box>
                  )}
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('config.importData.table.row')}</TableCell>
                          <TableCell>{t('config.importData.table.column')}</TableCell>
                          <TableCell>{t('config.importData.table.category')}</TableCell>
                          <TableCell>{t('config.importData.table.message')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResult.errors.slice(0, 50).map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{err.rowNumber}</TableCell>
                            <TableCell>{err.columnName}</TableCell>
                            <TableCell>{err.category}</TableCell>
                            <TableCell>{err.message}</TableCell>
                          </TableRow>
                        ))}
                        {validationResult.errors.length > 50 && (
                          <TableRow>
                            <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                              {t('config.importData.moreErrors', { count: validationResult.errors.length - 50 })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </Stack>
              )}

              {isValid && (
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={flow.phase === 'submitting' ? <CircularProgress size={16} color="inherit" /> : <SendRoundedIcon />}
                    onClick={handleSubmit}
                    disabled={flow.phase === 'submitting'}
                    size="small"
                  >
                    {flow.phase === 'submitting' ? t('config.importData.submitting') : t('config.importData.submit')}
                  </Button>
                </Box>
              )}
            </Stack>
          </Paper>
        </>
      )}

      {/* Submitted */}
      {flow.phase === 'submitted' && (
        <Alert
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={reset}>
              {t('config.importData.importAnother')}
            </Button>
          }
        >
          {t('config.importData.submitSuccess', {
            status: getJobStatusLabel(flow.jobStatus.status),
            jobId: flow.jobStatus.importJobId,
          })}
        </Alert>
      )}

      {/* Error */}
      {flow.phase === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reset}>
              {t('common.retry')}
            </Button>
          }
        >
          {flow.message}
        </Alert>
      )}
    </Stack>
  )
}

export default function ConfigImportDataPage() {
  const { t } = useTranslation()
  const [importTypes, setImportTypes] = useState<AvailableImportTypeResponse[]>(defaultImportTypes)
  const [selectedTab, setSelectedTab] = useState(0)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  useEffect(() => {
    getAvailableImportTypes()
      .then((types) => {
        if (types.length > 0) setImportTypes(types)
      })
      .catch(() => {
        // fallback to defaults — no user-visible error since defaults are already shown
      })
  }, [])

  const activeImportType = importTypes[selectedTab]?.importType ?? ''

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h5" sx={{ mb: 1 }}>{t('config.importData.title')}</Typography>
        <Typography color="text.secondary">{t('config.importData.description')}</Typography>
      </Paper>

      <Paper elevation={0} className="panel-card" sx={{ p: 0 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, v: number) => setSelectedTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {importTypes.map((dt) => (
            <Tab
              key={dt.importType}
              label={t(`config.importData.entityTypes.${dt.importType}`, { defaultValue: dt.importType })}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeImportType && (
            <>
              <ImportFlowPanel
                key={activeImportType}
                importType={activeImportType}
                onSubmitted={() => setHistoryRefresh((n) => n + 1)}
              />
              <Divider sx={{ my: 3 }} />
              <ImportHistoryPanel
                key={`history-${activeImportType}`}
                importType={activeImportType}
                refreshTrigger={historyRefresh}
              />
            </>
          )}
        </Box>
      </Paper>
    </Stack>
  )
}
