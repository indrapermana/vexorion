import { CheckCircleOutlineRoundedIcon, CloudUploadRoundedIcon, DownloadRoundedIcon, ErrorOutlineRoundedIcon, FileUploadRoundedIcon, SendRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDataGrid, VxDivider, VxStack, VxStep, VxStepLabel, VxStepper, VxTab, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTabs, VxTooltip, VxTypography, type VxGridColDef } from '@vexorion/ui'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageHeader } from '../../../components/PagePrimitives'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import {
  downloadImportTemplate,
  getAvailableImportTypes,
  getImportJobStatus,
  submitImportJob,
  validateImportFile,
  validateImportRows,
} from '../../../lib/api'
import ImportHistoryPanel from '../components/ImportHistoryPanel'
import type {
  AvailableImportTypeResponse,
  ImportJobStatusResponse,
  ImportPreviewRowResponse,
  ImportValidationResultResponse,
} from '../../../types/api'

type FlowState =
  | { phase: 'idle' }
  | { phase: 'downloading' }
  | { phase: 'validating' }
  | { phase: 'validated'; result: ImportValidationResultResponse }
  | { phase: 'submitting'; result: ImportValidationResultResponse }
  | { phase: 'submitted'; jobStatus: ImportJobStatusResponse }
  | { phase: 'recovering'; jobId: string; message?: string }
  | { phase: 'error'; message: string }

// Known import types for the tabs — used when backend list is not yet loaded
const defaultImportTypes: AvailableImportTypeResponse[] = [
  { importType: 'customer', columns: [] },
  { importType: 'supplier', columns: [] },
  { importType: 'product', columns: [] },
  { importType: 'sales-order', columns: [] },
  { importType: 'purchase-order', columns: [] },
]

function getJobStatusLabel(status: number): string {
  switch (status) {
    case 1: return 'pages.importData.history.statusLabels.draft'
    case 2: return 'pages.importData.history.statusLabels.validated'
    case 3: return 'pages.importData.history.statusLabels.failedValidation'
    case 4: return 'pages.importData.history.statusLabels.imported'
    case 5: return 'pages.importData.history.statusLabels.importFailed'
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
  canViewHistory: boolean
  historyRefresh: number
}

function ImportFlowPanel({ importType, onSubmitted, canSubmit, canViewHistory, historyRefresh }: ImportFlowPanelProps) {
  const { user } = useAuth()
  const storageKey = `vexorion.import-job:${user?.tenantId ?? 'unknown'}:${importType.toLowerCase()}`
  const submitting = useRef(false)
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [flow, setFlow] = useState<FlowState>(() => {
    const jobId = sessionStorage.getItem(storageKey)
    return jobId ? { phase: 'recovering', jobId } : { phase: 'idle' }
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [step, setStep] = useState(0)
  const [previewRows, setPreviewRows] = useState<ImportPreviewRowResponse[]>([])
  const [rowsDirty, setRowsDirty] = useState(false)
  const [lastValidationResult, setLastValidationResult] = useState<ImportValidationResultResponse | null>(null)
  const reset = () => {
    if (submitting.current || flow.phase === 'recovering') return
    sessionStorage.removeItem(storageKey)
    setFlow({ phase: 'idle' })
    setSelectedFile(null)
    setPreviewRows([])
    setRowsDirty(false)
    setLastValidationResult(null)
    setStep(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const refreshJob = async (jobId: string) => {
    if (submitting.current) return
    submitting.current = true
    try {
      const jobStatus = await getImportJobStatus(jobId)
      if (jobStatus.importType.toLowerCase() !== importType.toLowerCase()) throw new Error('Import type mismatch')
      if (jobStatus.status === 2 && !jobStatus.submittedAtUtc) {
        const result = { ...jobStatus, errors: [], previewHeaders: jobStatus.previewHeaders ?? [], previewRows: jobStatus.previewRows ?? [] }
        setPreviewRows(result.previewRows)
        setRowsDirty(false)
        setLastValidationResult(result)
        setFlow({ phase: 'validated', result })
        setStep(2)
      } else {
        setFlow({ phase: 'submitted', jobStatus })
        setStep(3)
        onSubmitted?.()
      }
    } catch {
      setFlow({ phase: 'recovering', jobId, message: t('pages.importData.recoveryUnavailable') })
      setStep(3)
    } finally { submitting.current = false }
  }

  const restoreJob = useEffectEvent(() => {
    const jobId = sessionStorage.getItem(storageKey)
    if (jobId) void refreshJob(jobId)
  })
  useEffect(() => { restoreJob() }, [storageKey])

  const { confirmationDialog } = useUnsavedChangesPrompt(
    selectedFile !== null && flow.phase !== 'submitted',
    flow.phase === 'downloading' || flow.phase === 'validating' || flow.phase === 'submitting',
    () => {},
    reset,
  )

  const handleDownloadTemplate = async () => {
    if (submitting.current || flow.phase === 'recovering' || flow.phase === 'submitting') return
    submitting.current = true
    const previous = flow
    setFlow({ phase: 'downloading' })
    try {
      await downloadImportTemplate(importType)
      setFlow(previous)
    } catch {
      setFlow({ phase: 'error', message: t('pages.importData.errors.downloadTemplate') })
    } finally { submitting.current = false }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (submitting.current || flow.phase === 'recovering' || flow.phase === 'submitting' || (flow.phase === 'submitted' && ![3, 4, 5].includes(flow.jobStatus.status))) return
    sessionStorage.removeItem(storageKey)
    setPreviewRows([])
    setRowsDirty(false)
    setLastValidationResult(null)
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    if (flow.phase === 'error' || flow.phase === 'validated' || flow.phase === 'submitted') {
      setFlow({ phase: 'idle' })
    }
  }

  const handleValidate = async () => {
    if (!selectedFile || submitting.current || flow.phase === 'recovering' || flow.phase === 'submitting') return
    submitting.current = true
    setFlow({ phase: 'validating' })
    try {
      const result = await validateImportFile(importType, selectedFile)
      setPreviewRows(result.previewRows)
      setRowsDirty(false)
      setLastValidationResult(result)
      if (canSubmit && result.status === 2 && result.invalidRows === 0 && result.validRows > 0) sessionStorage.setItem(storageKey, result.importJobId)
      setFlow({ phase: 'validated', result })
      setStep(2)
    } catch {
      setFlow({ phase: 'error', message: t('pages.importData.errors.validate') })
    } finally { submitting.current = false }
  }

  const validationResult = flow.phase === 'validated' || flow.phase === 'submitting'
    ? flow.result
    : flow.phase === 'validating' ? lastValidationResult : null
  const handleRevalidateRows = async () => {
    if (!validationResult || !rowsDirty || submitting.current || unresolved) return false
    submitting.current = true
    setFlow({ phase: 'validating' })
    try {
      const result = await validateImportRows({
        importType,
        fileName: validationResult.sourceFileName,
        headers: validationResult.previewHeaders,
        rows: previewRows,
      })
      setPreviewRows(result.previewRows)
      setRowsDirty(false)
      setLastValidationResult(result)
      if (canSubmit && result.status === 2 && result.invalidRows === 0 && result.validRows > 0) sessionStorage.setItem(storageKey, result.importJobId)
      else sessionStorage.removeItem(storageKey)
      setFlow({ phase: 'validated', result })
      return result.status === 2 && result.invalidRows === 0 && result.validRows > 0
    } catch {
      setFlow({ phase: 'validated', result: validationResult })
      return false
    } finally {
      submitting.current = false
    }
  }

  const handleNext = async () => {
    if (unresolved || submitting.current) return
    if (step === 0) {
      setStep(1)
      return
    }
    if (step === 1) {
      await handleValidate()
      return
    }
    if (step === 2) {
      if (rowsDirty) {
        if (await handleRevalidateRows()) setStep(3)
        return
      }
      if (isValid) setStep(3)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || flow.phase !== 'validated' || submitting.current || step !== 3 || rowsDirty) return
    const { result } = flow
    if (result.invalidRows > 0 || result.validRows === 0) return
    submitting.current = true
    setFlow({ phase: 'submitting', result })
    try {
      sessionStorage.setItem(storageKey, result.importJobId)
      const jobStatus = await submitImportJob(result.importJobId)
      setFlow({ phase: 'submitted', jobStatus })
      setStep(3)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onSubmitted?.()
    } catch {
      setFlow({ phase: 'recovering', jobId: result.importJobId, message: t('pages.importData.submitUnconfirmed') })
    } finally {
      submitting.current = false
    }
  }
  const isValid = validationResult ? validationResult.status === 2 && validationResult.invalidRows === 0 && validationResult.validRows > 0 : false
  const unresolved = flow.phase === 'recovering' || flow.phase === 'submitting' || (flow.phase === 'submitted' && ![3, 4, 5].includes(flow.jobStatus.status))
  const activeStep = flow.phase === 'submitted' || flow.phase === 'recovering' ? 3 : step
  const currentErrors = validationResult?.errors ?? []

  const gridRows = previewRows.map((row) => ({ id: row.rowNumber, rowNumber: row.rowNumber, ...row.values }))
  const gridColumns: VxGridColDef[] = [
    { field: 'rowNumber', headerName: t('pages.importData.table.row'), width: 85, editable: false },
    ...(validationResult?.previewHeaders ?? []).map((header): VxGridColDef => ({
      field: header,
      headerName: header,
      minWidth: 150,
      flex: 1,
      editable: true,
      cellClassName: (params) => currentErrors.some((error) => error.rowNumber === params.row.rowNumber && error.columnName.toLowerCase() === header.toLowerCase()) ? 'import-preview-cell-error' : '',
      renderCell: (params) => {
        const messages = currentErrors.filter((error) => error.rowNumber === params.row.rowNumber && error.columnName.toLowerCase() === header.toLowerCase()).map((error) => error.message)
        return <VxTooltip title={messages.join(' ')}><span>{String(params.value ?? '')}</span></VxTooltip>
      },
    })),
    { field: 'rowErrors', headerName: t('pages.importData.rowErrors'), minWidth: 220, flex: 1, editable: false, sortable: false, valueGetter: (_value, row) => currentErrors.filter((error) => error.rowNumber === row.rowNumber).map((error) => error.message).join(' ') },
  ]

  const processRowUpdate = (updatedRow: Record<string, unknown>) => {
    const rowNumber = Number(updatedRow.rowNumber)
    const values = Object.fromEntries((validationResult?.previewHeaders ?? []).map((header) => [header, String(updatedRow[header] ?? '')]))
    setPreviewRows((current) => current.map((row) => row.rowNumber === rowNumber ? { rowNumber, values } : row))
    setRowsDirty(true)
    sessionStorage.removeItem(storageKey)
    return updatedRow
  }

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
      <VxBox sx={{ overflowX: 'auto', pb: 1 }}>
        <VxStepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 480 }}>
          {['template', 'file', 'validate', 'submit'].map((stage) => <VxStep key={stage}><VxStepLabel>{t(`pages.importData.workflow.${stage}`)}</VxStepLabel></VxStep>)}
        </VxStepper>
      </VxBox>
      {step === 0 ? <VxBox component="section" sx={{ py: 1 }}>
        <VxStack spacing={1.5}>
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <DownloadRoundedIcon color="action" />
            <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('pages.importData.steps.downloadTemplate')}
            </VxTypography>
          </VxStack>
          <VxBox>
            <VxButton
              variant="outlined"
              startIcon={flow.phase === 'downloading' ? <VxCircularProgress size={16} /> : <DownloadRoundedIcon />}
              onClick={handleDownloadTemplate}
              disabled={flow.phase === 'downloading' || flow.phase === 'validating' || unresolved}
              size="small"
            >
              {flow.phase === 'downloading' ? t('pages.importData.downloading') : t('pages.importData.downloadTemplate')}
            </VxButton>
          </VxBox>
        </VxStack>
      </VxBox> : null}

      {step === 1 ? <VxBox component="section" sx={{ py: 1 }}>
        <VxStack spacing={1.5}>
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CloudUploadRoundedIcon color="action" />
            <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('pages.importData.steps.uploadFile')}
            </VxTypography>
          </VxStack>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              disabled={flow.phase === 'downloading' || flow.phase === 'validating' || unresolved}
              aria-label={t('pages.importData.chooseFile')}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id={`file-input-${importType}`}
            />
              <VxButton
                onClick={() => fileInputRef.current?.click()}
                variant="outlined"
                startIcon={<FileUploadRoundedIcon />}
                size="small"
                disabled={flow.phase === 'downloading' || flow.phase === 'validating' || unresolved}
              >
                {t('pages.importData.chooseFile')}
              </VxButton>
            {selectedFile && (
              <VxTypography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {selectedFile.name}
              </VxTypography>
            )}
          </VxStack>
        </VxStack>
      </VxBox> : null}

      {step === 2 && validationResult ? (
          <VxBox component="section" sx={{ py: 1, minWidth: 0 }}>
            <VxStack spacing={2}>
              <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {isValid
                  ? <CheckCircleOutlineRoundedIcon color="success" />
                  : <ErrorOutlineRoundedIcon color="error" />}
                <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('pages.importData.steps.validationResult')}
                </VxTypography>
              </VxStack>

              <VxStack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
                <VxChip
                  label={`${t('pages.importData.totalRows')}: ${validationResult.totalRows}`}
                  size="small"
                />
                <VxChip
                  color="success"
                  label={`${t('pages.importData.validRows')}: ${validationResult.validRows}`}
                  size="small"
                />
                {validationResult.invalidRows > 0 && (
                  <VxChip
                    color="error"
                    label={`${t('pages.importData.invalidRows')}: ${validationResult.invalidRows}`}
                    size="small"
                  />
                )}
              </VxStack>

              {validationResult.errors.some((error) => error.rowNumber <= 1) ? <VxAlert severity="error">{validationResult.errors.filter((error) => error.rowNumber <= 1).map((error) => error.message).join(' ')}</VxAlert> : null}
              {!isValid ? <VxAlert severity="warning">{t('pages.importData.correctionRequired')}</VxAlert> : null}
              {rowsDirty ? <VxAlert severity="info">{t('pages.importData.revalidateChanges')}</VxAlert> : null}
              {validationResult.errorWorkbookContent && !rowsDirty ? <VxButton variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={handleDownloadErrorWorkbook} size="small" sx={{ alignSelf: 'flex-start' }}>{t('pages.importData.downloadErrorWorkbook')}</VxButton> : null}
              {validationResult.errors.length > 0 ? <VxBox>
                <VxTypography component="h3" variant="subtitle2" sx={{ mb: 1 }}>{t('pages.importData.issueSummary')}</VxTypography>
                <VxTableContainer sx={{ maxHeight: 320 }}>
                  <VxTable size="small" stickyHeader aria-label={t('pages.importData.issueSummary')}>
                    <VxTableHead><VxTableRow>
                      <VxTableCell>{t('pages.importData.table.sheet')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.row')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.column')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.field')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.cause')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.correction')}</VxTableCell>
                      <VxTableCell>{t('pages.importData.table.retryPath')}</VxTableCell>
                    </VxTableRow></VxTableHead>
                    <VxTableBody>{validationResult.errors.map((error, index) => <VxTableRow key={`${error.rowNumber}-${error.columnName}-${index}`}>
                      <VxTableCell>{error.sheetName || t('pages.importData.unknownSheet')}</VxTableCell>
                      <VxTableCell>{error.rowNumber > 0 ? error.rowNumber : '—'}</VxTableCell>
                      <VxTableCell>{error.columnReference || error.columnName || '—'}</VxTableCell>
                      <VxTableCell>{error.fieldName || error.columnName || '—'}</VxTableCell>
                      <VxTableCell>{error.cause || error.message}</VxTableCell>
                      <VxTableCell>{error.suggestedAction || t('pages.importData.retryActions.editAndRevalidate')}</VxTableCell>
                      <VxTableCell><VxChip size="small" variant="outlined" label={error.retryAction === 'upload-corrected-file' ? t('pages.importData.retryActions.uploadCorrectedFile') : t('pages.importData.retryActions.editAndRevalidate')} /></VxTableCell>
                    </VxTableRow>)}</VxTableBody>
                  </VxTable>
                </VxTableContainer>
              </VxBox> : null}
              <VxBox sx={{ width: '100%', minWidth: 0 }}>
                <VxDataGrid
                  aria-label={t('pages.importData.previewGrid')}
                  rows={gridRows}
                  columns={gridColumns}
                  processRowUpdate={processRowUpdate}
                  onProcessRowUpdateError={() => setRowsDirty(true)}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  showToolbar={false}
                  disableColumnMenu
                  sx={{ minWidth: 0, '& .import-preview-cell-error': { backgroundColor: 'error.light', color: 'error.contrastText' } }}
                />
              </VxBox>
            </VxStack>
          </VxBox>
      ) : null}

      {step === 3 ? <VxStack spacing={2}>
        {validationResult ? <>
          <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>{selectedFile?.name ?? validationResult.sourceFileName}</VxTypography>
          <VxStack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
            <VxChip label={`${t('pages.importData.totalRows')}: ${validationResult.totalRows}`} size="small" />
            <VxChip color="success" label={`${t('pages.importData.validRows')}: ${validationResult.validRows}`} size="small" />
            {validationResult.invalidRows > 0 ? <VxChip color="error" label={`${t('pages.importData.invalidRows')}: ${validationResult.invalidRows}`} size="small" /> : null}
          </VxStack>
        </> : null}
        {canSubmit && isValid && !rowsDirty && flow.phase !== 'submitted' ? <VxButton variant="contained" color="success" startIcon={unresolved ? <VxCircularProgress size={16} color="inherit" /> : <SendRoundedIcon />} onClick={() => void handleSubmit()} disabled={unresolved}>{unresolved ? t('pages.importData.submitting') : t('pages.importData.submit')}</VxButton> : null}
        {!canSubmit ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.submit} /> : null}
        {flow.phase === 'submitted' && (
        <VxAlert
          severity={flow.jobStatus.status === 4 ? 'success' : flow.jobStatus.status === 5 ? 'error' : 'info'}
          action={
            <VxButton color="inherit" size="small" disabled={unresolved} onClick={reset}>
              {t('pages.importData.importAnother')}
            </VxButton>
          }
        >
          {t('pages.importData.submitSuccess', {
            status: flow.jobStatus.submittedAtUtc && !flow.jobStatus.completedAtUtc && flow.jobStatus.status === 2 ? t('pages.importData.submissionPending') : t(getJobStatusLabel(flow.jobStatus.status)),
            jobId: flow.jobStatus.importJobId,
          })}
        </VxAlert>
        )}

      {flow.phase === 'recovering' ? <VxAlert severity="warning" action={<VxButton onClick={() => void refreshJob(flow.jobId)}>{t('common.refresh')}</VxButton>}>{flow.message ?? t('pages.importData.submitUnconfirmed')}</VxAlert> : null}
      {flow.phase === 'submitted' ? <VxStack spacing={1}><VxTypography variant="body2">{flow.jobStatus.importJobId}</VxTypography>{flow.jobStatus.errorSummary ? <VxAlert severity="error">{flow.jobStatus.errorSummary}</VxAlert> : null}<VxButton onClick={() => void refreshJob(flow.jobStatus.importJobId)}>{t('common.refresh')}</VxButton></VxStack> : null}
      {canViewHistory ? <><VxDivider /><ImportHistoryPanel importType={importType} refreshTrigger={historyRefresh} /></> : null}
      </VxStack> : null}

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
      {confirmationDialog}
      <VxStack direction="row" spacing={1} sx={{ justifyContent: 'space-between', pt: 1 }}>
        <VxButton variant="outlined" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || unresolved || flow.phase === 'validating' || flow.phase === 'submitted'}>{t('pages.importData.previous')}</VxButton>
        {step < 3 ? <VxButton variant="contained" onClick={() => void handleNext()} disabled={unresolved || flow.phase === 'validating' || (step === 1 && !selectedFile) || (step === 2 && !rowsDirty && !isValid)} startIcon={flow.phase === 'validating' ? <VxCircularProgress size={16} color="inherit" /> : undefined}>{flow.phase === 'validating' ? t('pages.importData.validating') : t('pages.importData.next')}</VxButton> : null}
      </VxStack>
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
  const [selectedTab, setSelectedTab] = useState('customer')
  const [visited, setVisited] = useState(() => new Set(['customer']))
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

  const labels: Record<string, string> = { customer: 'Customer', supplier: 'Supplier', product: 'Product', 'sales-order': 'SalesOrder', 'purchase-order': 'PurchaseOrder' }

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('pages.importData.title')} />

      {!canValidate ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.validate} /> : null}
      {canValidate && !canSubmit ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.submit} /> : null}
      {!canViewHistory ? <PermissionReadOnlyAlert requiredPermission={Permissions.imports.history} /> : null}

      <PageBody>
        <VxTabs
          value={selectedTab}
          onChange={(_, value: string) => { setSelectedTab(value); setVisited((previous) => new Set([...previous, value])) }}
          aria-label={t('pages.importData.title')}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {importTypes.map((dt) => (
            <VxTab
              key={dt.importType}
              value={dt.importType}
              id={`import-tab-${dt.importType}`}
              aria-controls={`import-panel-${dt.importType}`}
              label={t(`pages.importData.entityTypes.${labels[dt.importType] ?? dt.importType}`, { defaultValue: dt.importType })}
            />
          ))}
        </VxTabs>

        <VxBox sx={{ p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
          {importTypes.filter((type) => visited.has(type.importType)).map(({ importType: activeImportType }) => (
            <VxBox key={activeImportType} role="tabpanel" id={`import-panel-${activeImportType}`} aria-labelledby={`import-tab-${activeImportType}`} hidden={selectedTab !== activeImportType} sx={{ minWidth: 0 }}>
              {canValidate ? <ImportFlowPanel
                key={`${user?.tenantId ?? 'unknown'}:${activeImportType}`}
                importType={activeImportType}
                canSubmit={canSubmit}
                canViewHistory={canViewHistory}
                historyRefresh={historyRefresh}
                onSubmitted={() => setHistoryRefresh((n) => n + 1)}
              /> : null}
              {!canValidate && canViewHistory ? <ImportHistoryPanel key={`history-${activeImportType}`} importType={activeImportType} refreshTrigger={historyRefresh} /> : null}
            </VxBox>
          ))}
        </VxBox>
      </PageBody>
    </VxStack>
  )
}
