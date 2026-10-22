import { CheckCircleOutlineRoundedIcon, CloudUploadRoundedIcon, DownloadRoundedIcon, ErrorOutlineRoundedIcon, FileUploadRoundedIcon, SendRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDivider, VxPaper, VxStack, VxTab, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTabs, VxTypography } from '@vexorion/ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageHeader } from '../../../components/PagePrimitives'
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
  canSubmit: boolean
}

function ImportFlowPanel({ importType, onSubmitted, canSubmit }: ImportFlowPanelProps) {
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
    if (!canSubmit || flow.phase !== 'validated') return
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
    <VxStack spacing={3}>
      {/* Step 1: Download Template */}
      <VxPaper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
        <VxStack spacing={1.5}>
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <DownloadRoundedIcon color="action" />
            <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('config.importData.steps.downloadTemplate')}
            </VxTypography>
          </VxStack>
          <VxTypography variant="body2" color="text.secondary">
            {t('config.importData.steps.downloadTemplateDesc')}
          </VxTypography>
          <VxBox>
            <VxButton
              variant="outlined"
              startIcon={flow.phase === 'downloading' ? <VxCircularProgress size={16} /> : <DownloadRoundedIcon />}
              onClick={handleDownloadTemplate}
              disabled={flow.phase === 'downloading' || flow.phase === 'validating' || flow.phase === 'submitting'}
              size="small"
            >
              {flow.phase === 'downloading' ? t('config.importData.downloading') : t('config.importData.downloadTemplate')}
            </VxButton>
          </VxBox>
        </VxStack>
      </VxPaper>

      <VxDivider />

      {/* Step 2: Upload File */}
      <VxPaper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
        <VxStack spacing={1.5}>
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CloudUploadRoundedIcon color="action" />
            <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('config.importData.steps.uploadFile')}
            </VxTypography>
          </VxStack>
          <VxTypography variant="body2" color="text.secondary">
            {t('config.importData.steps.uploadFileDesc')}
          </VxTypography>
          <VxStack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id={`file-input-${importType}`}
            />
            <label htmlFor={`file-input-${importType}`}>
              <VxButton
                component="span"
                variant="outlined"
                startIcon={<FileUploadRoundedIcon />}
                size="small"
                disabled={flow.phase === 'validating' || flow.phase === 'submitting'}
              >
                {t('config.importData.chooseFile')}
              </VxButton>
            </label>
            {selectedFile && (
              <VxTypography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {selectedFile.name}
              </VxTypography>
            )}
          </VxStack>
          {selectedFile && (
            <VxBox>
              <VxButton
                variant="contained"
                startIcon={flow.phase === 'validating' ? <VxCircularProgress size={16} color="inherit" /> : <CheckCircleOutlineRoundedIcon />}
                onClick={handleValidate}
                disabled={flow.phase === 'validating' || flow.phase === 'submitting'}
                size="small"
              >
                {flow.phase === 'validating' ? t('config.importData.validating') : t('config.importData.validate')}
              </VxButton>
            </VxBox>
          )}
        </VxStack>
      </VxPaper>

      {/* Validation Result */}
      {validationResult && (
        <>
          <VxDivider />
          <VxPaper elevation={0} className="panel-card" sx={{ p: 2.5 }}>
            <VxStack spacing={2}>
              <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {isValid
                  ? <CheckCircleOutlineRoundedIcon color="success" />
                  : <ErrorOutlineRoundedIcon color="error" />}
                <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('config.importData.steps.validationResult')}
                </VxTypography>
              </VxStack>

              <VxStack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <VxChip
                  label={`${t('config.importData.totalRows')}: ${validationResult.totalRows}`}
                  size="small"
                />
                <VxChip
                  color="success"
                  label={`${t('config.importData.validRows')}: ${validationResult.validRows}`}
                  size="small"
                />
                {validationResult.invalidRows > 0 && (
                  <VxChip
                    color="error"
                    label={`${t('config.importData.invalidRows')}: ${validationResult.invalidRows}`}
                    size="small"
                  />
                )}
              </VxStack>

              {canSubmit && isValid && (
                <VxAlert severity="success">{t('config.importData.allRowsValid')}</VxAlert>
              )}

              {!isValid && validationResult.errors.length > 0 && (
                <VxStack spacing={1.5}>
                  {validationResult.errorWorkbookContent && (
                    <VxBox>
                      <VxButton
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={handleDownloadErrorWorkbook}
                        size="small"
                      >
                        {t('config.importData.downloadErrorWorkbook')}
                      </VxButton>
                    </VxBox>
                  )}
                  <VxBox sx={{ overflowX: 'auto' }}>
                    <VxTable size="small">
                      <VxTableHead>
                        <VxTableRow>
                          <VxTableCell>{t('config.importData.table.row')}</VxTableCell>
                          <VxTableCell>{t('config.importData.table.column')}</VxTableCell>
                          <VxTableCell>{t('config.importData.table.category')}</VxTableCell>
                          <VxTableCell>{t('config.importData.table.message')}</VxTableCell>
                        </VxTableRow>
                      </VxTableHead>
                      <VxTableBody>
                        {validationResult.errors.slice(0, 50).map((err, idx) => (
                          <VxTableRow key={idx}>
                            <VxTableCell>{err.rowNumber}</VxTableCell>
                            <VxTableCell>{err.columnName}</VxTableCell>
                            <VxTableCell>{err.category}</VxTableCell>
                            <VxTableCell>{err.message}</VxTableCell>
                          </VxTableRow>
                        ))}
                        {validationResult.errors.length > 50 && (
                          <VxTableRow>
                            <VxTableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                              {t('config.importData.moreErrors', { count: validationResult.errors.length - 50 })}
                            </VxTableCell>
                          </VxTableRow>
                        )}
                      </VxTableBody>
                    </VxTable>
                  </VxBox>
                </VxStack>
              )}

              {isValid && (
                <VxBox>
                  <VxButton
                    variant="contained"
                    color="success"
                    startIcon={flow.phase === 'submitting' ? <VxCircularProgress size={16} color="inherit" /> : <SendRoundedIcon />}
                    onClick={handleSubmit}
                    disabled={flow.phase === 'submitting'}
                    size="small"
                  >
                    {flow.phase === 'submitting' ? t('config.importData.submitting') : t('config.importData.submit')}
                  </VxButton>
                </VxBox>
              )}
            </VxStack>
          </VxPaper>
        </>
      )}

      {/* Submitted */}
      {flow.phase === 'submitted' && (
        <VxAlert
          severity="success"
          action={
            <VxButton color="inherit" size="small" onClick={reset}>
              {t('config.importData.importAnother')}
            </VxButton>
          }
        >
          {t('config.importData.submitSuccess', {
            status: getJobStatusLabel(flow.jobStatus.status),
            jobId: flow.jobStatus.importJobId,
          })}
        </VxAlert>
      )}

      {/* Error */}
      {flow.phase === 'error' && (
        <VxAlert
          severity="error"
          action={
            <VxButton color="inherit" size="small" onClick={reset}>
              {t('common.retry')}
            </VxButton>
          }
        >
          {flow.message}
        </VxAlert>
      )}
    </VxStack>
  )
}

export default function ConfigImportDataPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canValidate = user?.permissions.includes(Permissions.imports.validate) ?? false
  const canSubmit = user?.permissions.includes(Permissions.imports.submit) ?? false
  const canViewHistory = user?.permissions.includes(Permissions.imports.history) ?? false
  const [importTypes, setImportTypes] = useState<AvailableImportTypeResponse[]>(defaultImportTypes)
  const [selectedTab, setSelectedTab] = useState(0)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  useEffect(() => {
    if (!canValidate) return

    getAvailableImportTypes()
      .then((types) => {
        if (types.length > 0) setImportTypes(types)
      })
      .catch(() => {
        // fallback to defaults — no user-visible error since defaults are already shown
      })
  }, [canValidate])

  const activeImportType = importTypes[selectedTab]?.importType ?? ''

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('config.importData.title')} description={t('config.importData.description')} />

      {!canValidate ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.validate} /> : null}
      {canValidate && !canSubmit ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.submit} /> : null}
      {!canViewHistory ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.history} /> : null}

      <PageBody>
        <VxTabs
          value={selectedTab}
          onChange={(_, v: number) => setSelectedTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {importTypes.map((dt) => (
            <VxTab
              key={dt.importType}
              label={t(`config.importData.entityTypes.${dt.importType}`, { defaultValue: dt.importType })}
            />
          ))}
        </VxTabs>

        <VxBox sx={{ p: 3 }}>
          {activeImportType && (
            <>
              {canValidate ? <ImportFlowPanel
                key={activeImportType}
                importType={activeImportType}
                canSubmit={canSubmit}
                onSubmitted={() => setHistoryRefresh((n) => n + 1)}
              /> : null}
              {canValidate && canViewHistory ? <VxDivider sx={{ my: 3 }} /> : null}
              {canViewHistory ? <ImportHistoryPanel
                key={`history-${activeImportType}`}
                importType={activeImportType}
                refreshTrigger={historyRefresh}
              /> : null}
            </>
          )}
        </VxBox>
      </PageBody>
    </VxStack>
  )
}
