import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AddRoundedIcon,
  CloudUploadRoundedIcon,
  DeleteOutlineRoundedIcon,
  DownloadRoundedIcon,
  EditRoundedIcon,
  VisibilityRoundedIcon,
  FolderRoundedIcon,
  SearchRoundedIcon,
  VxAlert,
  VxBox,
  VxButton,
  VxChip,
  VxCircularProgress,
  VxConfirmActionButton,
  VxConfirmActionDialog,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxIconButton,
  VxInputAdornment,
  VxMenuItem,
  VxPaper,
  VxStack,
  VxTable,
  VxTableBody,
  VxTableCell,
  VxTableContainer,
  VxTableHead,
  VxTableRow,
  VxTextField,
  VxTooltip,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import {
  ApiError,
  addProjectDocumentVersion,
  changeProjectDocumentStatus,
  createProjectDocumentFolder,
  deleteProjectDocument,
  deleteProjectDocumentFolder,
  getProjectDocumentDownload,
  getProjectDocument,
  getProjectDocumentFolders,
  getProjectDocumentVersions,
  getProjectDocuments,
  updateProjectDocument,
  updateProjectDocumentFolder,
  uploadProjectDocument,
} from '../../../lib/api'
import type {
  DocumentFolderListItemResponse,
  ManagedDocumentStatus,
  ProjectDocumentListItemResponse,
  ProjectDocumentVersionListItemResponse,
} from '../../../types/api'

type DocumentsPanelProps = {
  projectId: string
}

type FolderEditorState = {
  mode: 'create' | 'edit'
  folderId?: string
  parentFolderId?: string | null
  name: string
  description: string
}

type UploadFormBaseline = {
  title: string
  tags: string
  notes: string
  folderId: string | undefined
  file: File | null
}

type MetadataFormBaseline = {
  title: string
  tags: string
  notes: string
  folderId: string
}

type VersionFormBaseline = {
  notes: string
  file: File | null
}

const statusOptions: Array<{ value: ManagedDocumentStatus; key: string }> = [
  { value: 1, key: 'draft' },
  { value: 2, key: 'inReview' },
  { value: 3, key: 'approved' },
  { value: 4, key: 'submitted' },
  { value: 5, key: 'archived' },
  { value: 6, key: 'rejected' },
]

function formatBytes(size: number) {
  if (size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / (1024 ** index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export default function DocumentsPanel({ projectId }: DocumentsPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const canView = user?.permissions.includes('project-documents.view') ?? false
  const canUpload = user?.permissions.includes('project-documents.upload') ?? false
  const canDownload = user?.permissions.includes('project-documents.download') ?? false
  const canManage = user?.permissions.includes('project-documents.manage') ?? false

  const [folders, setFolders] = useState<DocumentFolderListItemResponse[]>([])
  const [documents, setDocuments] = useState<ProjectDocumentListItemResponse[]>([])
  const [versions, setVersions] = useState<ProjectDocumentVersionListItemResponse[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionsError, setVersionsError] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const selectedFolderId = searchParams.get('folder') || undefined
  const statusValue = Number(searchParams.get('documentStatus'))
  const statusFilter: ManagedDocumentStatus | '' = statusOptions.some((option) => option.value === statusValue) ? statusValue as ManagedDocumentStatus : ''
  const searchTerm = searchParams.get('documentSearch') ?? ''

  const visibleDocuments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    return documents.filter((item) => {
      if (selectedFolderId && item.documentFolderId !== selectedFolderId) return false
      if (statusFilter !== '' && item.status !== statusFilter) return false
      return !normalized || [item.title, item.fileName, item.documentNumber, item.tags ?? ''].some((value) => value.toLowerCase().includes(normalized))
    })
  }, [documents, searchTerm, selectedFolderId, statusFilter])
  const selectedDocumentId = searchParams.get('document') || visibleDocuments[0]?.id

  const updateView = (key: string, value: string | undefined) => {
    if ((searchParams.get(key) ?? '') === (value ?? '')) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }
  const setSelectedFolderId = (value: string | undefined | ((previous: string | undefined) => string | undefined)) => {
    updateView('folder', typeof value === 'function' ? value(selectedFolderId) : value)
  }

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [folderEditor, setFolderEditor] = useState<FolderEditorState | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [metaEditorOpen, setMetaEditorOpen] = useState(false)
  const [deleteDocument, setDeleteDocument] = useState<ProjectDocumentListItemResponse | null>(null)

  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [versionNotes, setVersionNotes] = useState('')
  const [versionFile, setVersionFile] = useState<File | null>(null)

  const selectedDocument = useMemo(
    () => visibleDocuments.find((item) => item.id === selectedDocumentId) ?? null,
    [visibleDocuments, selectedDocumentId],
  )

  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editFolderId, setEditFolderId] = useState<string | ''>('')
  const [nextStatus, setNextStatus] = useState<ManagedDocumentStatus | ''>('')
  const folderBaseline = useRef<FolderEditorState | null>(null)
  const uploadBaseline = useRef<UploadFormBaseline | null>(null)
  const metadataBaseline = useRef<MetadataFormBaseline | null>(null)
  const versionBaseline = useRef<VersionFormBaseline | null>(null)
  const [uploadFileInputKey, setUploadFileInputKey] = useState(0)
  const [versionFileInputKey, setVersionFileInputKey] = useState(0)

  const { requestClose: requestFolderClose, confirmationDialog: folderDiscardDialog } = useUnsavedChangesPrompt(
    Boolean(folderEditor && folderBaseline.current && JSON.stringify(folderEditor) !== JSON.stringify(folderBaseline.current)),
    isSaving,
    () => setFolderEditor(null),
    () => setFolderEditor(folderBaseline.current),
  )
  const { requestClose: requestUploadClose, confirmationDialog: uploadDiscardDialog } = useUnsavedChangesPrompt(
    uploadDialogOpen && Boolean(uploadBaseline.current && (
      uploadTitle !== uploadBaseline.current.title
      || uploadTags !== uploadBaseline.current.tags
      || uploadNotes !== uploadBaseline.current.notes
      || selectedFolderId !== uploadBaseline.current.folderId
      || uploadFile !== uploadBaseline.current.file
    )),
    isSaving,
    () => setUploadDialogOpen(false),
    () => {
      const baseline = uploadBaseline.current
      if (!baseline) return
      setUploadTitle(baseline.title)
      setUploadTags(baseline.tags)
      setUploadNotes(baseline.notes)
      setSelectedFolderId(baseline.folderId)
      setUploadFile(baseline.file)
      setUploadFileInputKey((key) => key + 1)
    },
  )
  const { requestClose: requestMetadataClose, confirmationDialog: metadataDiscardDialog } = useUnsavedChangesPrompt(
    metaEditorOpen && Boolean(metadataBaseline.current && (
      editTitle !== metadataBaseline.current.title
      || editTags !== metadataBaseline.current.tags
      || editNotes !== metadataBaseline.current.notes
      || editFolderId !== metadataBaseline.current.folderId
    )),
    isSaving,
    () => setMetaEditorOpen(false),
    () => {
      const baseline = metadataBaseline.current
      if (!baseline) return
      setEditTitle(baseline.title)
      setEditTags(baseline.tags)
      setEditNotes(baseline.notes)
      setEditFolderId(baseline.folderId)
    },
  )
  const { requestClose: requestVersionClose, confirmationDialog: versionDiscardDialog } = useUnsavedChangesPrompt(
    newVersionDialogOpen && Boolean(versionBaseline.current && (
      versionNotes !== versionBaseline.current.notes
      || versionFile !== versionBaseline.current.file
    )),
    isSaving,
    () => setNewVersionDialogOpen(false),
    () => {
      const baseline = versionBaseline.current
      if (!baseline) return
      setVersionNotes(baseline.notes)
      setVersionFile(baseline.file)
      setVersionFileInputKey((key) => key + 1)
    },
  )

  const openFolderEditor = (next: FolderEditorState) => {
    folderBaseline.current = next
    setFolderEditor(next)
  }
  const openUploadDialog = () => {
    uploadBaseline.current = { title: uploadTitle, tags: uploadTags, notes: uploadNotes, folderId: selectedFolderId, file: uploadFile }
    setUploadDialogOpen(true)
  }
  const openMetadataEditor = async (document: ProjectDocumentListItemResponse) => {
    if (!canManage || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const details = await getProjectDocument(projectId, document.id)
      const baseline = { title: details.title, tags: details.tags ?? '', notes: details.notes ?? '', folderId: details.documentFolderId ?? '' }
      metadataBaseline.current = baseline
      setEditTitle(baseline.title)
      setEditTags(baseline.tags)
      setEditNotes(baseline.notes)
      setEditFolderId(baseline.folderId)
      updateView('document', document.id)
      setMetaEditorOpen(true)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectDetails.documentsPanel.errors.load'))
    } finally {
      setIsSaving(false)
    }
  }
  const openVersionDialog = () => {
    versionBaseline.current = { notes: versionNotes, file: versionFile }
    setNewVersionDialogOpen(true)
  }

  const openDocumentFile = async (document: ProjectDocumentListItemResponse, mode: 'preview' | 'download') => {
    if (!canDownload) return
    try {
      const result = await getProjectDocumentDownload(projectId, document.id)
      if (mode === 'preview') {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
      } else {
        const anchor = window.document.createElement('a')
        anchor.href = result.downloadUrl
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer'
        anchor.download = result.fileName
        window.document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }
    } catch (downloadError) {
      setError(downloadError instanceof ApiError ? downloadError.message : t('pages.projectDetails.documentsPanel.errors.download'))
    }
  }

  const folderPath = useMemo(() => {
    const path: DocumentFolderListItemResponse[] = []
    const visited = new Set<string>()
    let folderId = selectedFolderId
    while (folderId && !visited.has(folderId)) {
      visited.add(folderId)
      const folder = folders.find((item) => item.id === folderId)
      if (!folder) break
      path.unshift(folder)
      folderId = folder.parentFolderId ?? undefined
    }
    return path
  }, [folders, selectedFolderId])

  const folderChildren = useMemo(() => {
    const map = new Map<string | null, DocumentFolderListItemResponse[]>()
    folders.forEach((folder) => {
      const key = folder.parentFolderId ?? null
      const group = map.get(key) ?? []
      group.push(folder)
      map.set(key, group)
    })

    map.forEach((group) => group.sort((a, b) => a.name.localeCompare(b.name)))
    return map
  }, [folders])

  const loadContext = useCallback(async () => {
    if (!canView) return

    setIsLoading(true)
    setError(null)

    try {
      const [folderResult, documentResult] = await Promise.all([
        getProjectDocumentFolders(projectId),
        getProjectDocuments(projectId),
      ])

      setFolders(folderResult)
      setDocuments(documentResult)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectDetails.documentsPanel.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [canView, projectId, t])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  const availableDocumentId = selectedDocument?.id

  useEffect(() => {
    let active = true
    if (!canView || !availableDocumentId) {
      setVersions([])
      setVersionsLoading(false)
      setVersionsError(false)
      return
    }

    setVersions([])
    setVersionsLoading(true)
    setVersionsError(false)
    const loadVersions = async () => {
      try {
        const result = await getProjectDocumentVersions(projectId, availableDocumentId)
        if (active) setVersions(result)
      } catch {
        if (active) setVersionsError(true)
      } finally {
        if (active) setVersionsLoading(false)
      }
    }

    void loadVersions()
    return () => { active = false }
  }, [canView, projectId, availableDocumentId, versionRefresh])

  useEffect(() => {
    if (!selectedDocument) return
    setNextStatus(selectedDocument.status)
  }, [selectedDocument])

  const selectedStatusLabel = (status: ManagedDocumentStatus) => {
    const option = statusOptions.find((item) => item.value === status)
    return option ? t(`pages.projectDetails.documentsPanel.status.${option.key}`) : String(status)
  }

  const renderFolderTree = (parentFolderId: string | null, depth: number) => {
    const children = folderChildren.get(parentFolderId) ?? []
    return children.map((folder) => (
      <VxBox key={folder.id}>
        <VxStack direction="row" spacing={0.25} sx={{ alignItems: 'center', pl: Math.min(depth, 4) * 1.5, py: 0.5, minWidth: 0 }}>
          <VxButton
            size="small"
            variant="text"
            startIcon={<FolderRoundedIcon fontSize="small" />}
            aria-pressed={selectedFolderId === folder.id}
            title={folder.name}
            sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', borderRadius: '6px', px: 1, bgcolor: selectedFolderId === folder.id ? 'action.selected' : 'transparent' }}
            onClick={() => setSelectedFolderId((prev) => (prev === folder.id ? undefined : folder.id))}
          >
            <VxTypography component="span" variant="body2" noWrap sx={{ minWidth: 0 }}>{folder.name}</VxTypography>
          </VxButton>
          {canManage ? (
            <>
              <VxTooltip title={t('common.edit')}>
                <VxIconButton size="small" aria-label={`${t('common.edit')}: ${folder.name}`} onClick={() => openFolderEditor({ mode: 'edit', folderId: folder.id, parentFolderId: folder.parentFolderId ?? null, name: folder.name, description: folder.description ?? '' })}>
                  <EditRoundedIcon fontSize="small" />
                </VxIconButton>
              </VxTooltip>
              <VxConfirmActionButton
                title={t('common.delete')}
                targetName={folder.name}
                consequence={t('pages.deleteConfirmations.folder.consequence')}
                confirmLabel={t('common.delete')}
                pendingLabel={t('dialogs.deleting')}
                buttonProps={{ size: 'small', color: 'error', variant: 'text', disabled: isSaving, 'aria-label': `${t('common.delete')}: ${folder.name}`, title: t('common.delete'), sx: { minWidth: 28, width: 28, height: 28, p: 0, flexShrink: 0, borderRadius: '6px' } }}
                onConfirm={async () => {
                  setIsSaving(true)
                  setError(null)
                  setFeedback(null)
                  try {
                    await deleteProjectDocumentFolder(projectId, folder.id)
                    setFeedback(t('pages.projectDetails.documentsPanel.feedback.folderDeleted'))
                    await loadContext()
                  } catch (deleteError) {
                    setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projectDetails.documentsPanel.errors.folderDelete'))
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </VxConfirmActionButton>
            </>
          ) : null}
        </VxStack>
        {renderFolderTree(folder.id, depth + 1)}
      </VxBox>
    ))
  }

  if (!canView) {
    return <VxAlert severity="info">{t('pages.projectDetails.documentsPanel.noAccess')}</VxAlert>
  }

  return (
    <VxStack spacing={2}>
      {error ? <VxAlert severity="error" onClose={() => setError(null)}>{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success" onClose={() => setFeedback(null)}>{feedback}</VxAlert> : null}

      <VxBox sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '220px minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start', minWidth: 0 }}>
          <VxBox component="nav" aria-label={t('pages.projectDetails.documentsPanel.folders')} sx={{ minWidth: 0, pr: { lg: 2.5 }, pb: { xs: 2, lg: 0 }, borderRight: { lg: 1 }, borderBottom: { xs: 1, lg: 0 }, borderColor: 'divider' }}>
            <VxStack spacing={1}>
              <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <VxTypography component="h3" variant="subtitle2">{t('pages.projectDetails.documentsPanel.folders')}</VxTypography>
                {canManage ? (
                  <VxTooltip title={t('pages.projectDetails.documentsPanel.newFolder')}>
                    <VxIconButton size="small" aria-label={t('pages.projectDetails.documentsPanel.newFolder')} onClick={() => openFolderEditor({ mode: 'create', parentFolderId: selectedFolderId ?? null, name: '', description: '' })}>
                      <AddRoundedIcon fontSize="small" />
                    </VxIconButton>
                  </VxTooltip>
                ) : null}
              </VxStack>
              <VxButton size="small" variant="text" startIcon={<FolderRoundedIcon />} aria-pressed={!selectedFolderId} sx={{ justifyContent: 'flex-start', borderRadius: '6px', minHeight: 36, bgcolor: selectedFolderId ? 'transparent' : 'action.selected' }} onClick={() => setSelectedFolderId(undefined)}>
                {t('pages.projectDetails.documentsPanel.allFolders')}
              </VxButton>
              <VxBox sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                {folders.length === 0 ? (
                  <VxTypography color="text.secondary" variant="body2">{t('pages.projectDetails.documentsPanel.noFolders')}</VxTypography>
                ) : renderFolderTree(null, 0)}
              </VxBox>
            </VxStack>
          </VxBox>

          <VxBox sx={{ minWidth: 0 }}>
            <VxStack spacing={1.5}>
              <VxBox component="nav" aria-label={t('pages.projectDetails.documentsPanel.breadcrumbs')}>
                <VxStack component="ol" direction="row" useFlexGap spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                  <VxBox component="li"><VxButton size="small" variant="text" aria-current={!selectedFolderId ? 'location' : undefined} onClick={() => setSelectedFolderId(undefined)}>{t('pages.projectDetails.documentsPanel.allFolders')}</VxButton></VxBox>
                  {folderPath.map((folder, index) => (
                    <VxBox component="li" key={folder.id} sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <VxTypography aria-hidden="true" color="text.secondary">/</VxTypography>
                      <VxButton size="small" variant="text" aria-current={index === folderPath.length - 1 ? 'location' : undefined} onClick={() => setSelectedFolderId(folder.id)} sx={{ maxWidth: '100%', overflowWrap: 'anywhere', textAlign: 'left' }}>{folder.name}</VxButton>
                    </VxBox>
                  ))}
                </VxStack>
              </VxBox>
              <VxBox sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 180px', md: canUpload ? 'minmax(0, 1fr) 160px max-content' : 'minmax(0, 1fr) 180px' }, gap: 1.5, alignItems: 'center' }}>
                  <VxTextField
                    size="small"
                    fullWidth
                    label={t('pages.projectDetails.documentsPanel.search')}
                    value={searchTerm}
                    onChange={(event) => updateView('documentSearch', event.target.value)}
                    slotProps={{ input: { startAdornment: <VxInputAdornment position="start"><SearchRoundedIcon fontSize="small" /></VxInputAdornment> } }}
                    sx={{ minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                  />
                  <VxTextField
                    select
                    size="small"
                    fullWidth
                    label={t('pages.projectDetails.documentsPanel.statusFilter')}
                    value={statusFilter}
                    onChange={(event) => updateView('documentStatus', event.target.value)}
                    sx={{ minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                  >
                    <VxMenuItem value="">{t('pages.projectDetails.documentsPanel.allStatuses')}</VxMenuItem>
                    {statusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`pages.projectDetails.documentsPanel.status.${option.key}`)}</VxMenuItem>)}
                  </VxTextField>
                {canUpload ? (
                  <VxButton variant="contained" startIcon={<CloudUploadRoundedIcon />} sx={{ height: 40, py: 0, whiteSpace: 'nowrap', borderRadius: '6px', gridColumn: { sm: '1 / -1', md: 'auto' }, justifySelf: { xs: 'stretch', sm: 'end' }, width: { xs: '100%', sm: 'auto' } }} onClick={openUploadDialog}>
                    {t('pages.projectDetails.documentsPanel.upload')}
                  </VxButton>
                ) : null}
              </VxBox>

              {selectedDocument ? (
                <VxStack role="region" aria-label={t('pages.projectDetails.documentsPanel.selectedDocument')} spacing={1} sx={{ py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider', minWidth: 0 }}>
                  <VxTypography component="h3" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>{selectedDocument.documentNumber} - {selectedDocument.title}</VxTypography>
                  <VxStack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', '& .MuiButton-root': { borderRadius: '6px', textAlign: 'left' } }}>
                    {canDownload ? <>
                      <VxButton size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} disabled={isSaving} onClick={() => void openDocumentFile(selectedDocument, 'preview')}>{t('pages.projectDetails.documentsPanel.preview', { defaultValue: 'Preview' })}</VxButton>
                      <VxButton size="small" variant="text" startIcon={<DownloadRoundedIcon />} disabled={isSaving} onClick={() => void openDocumentFile(selectedDocument, 'download')}>{t('pages.projectDetails.documentsPanel.download')}</VxButton>
                    </> : null}
                    {canUpload ? <VxButton size="small" variant="outlined" startIcon={<CloudUploadRoundedIcon />} disabled={isSaving} onClick={openVersionDialog}>{t('pages.projectDetails.documentsPanel.addVersion')}</VxButton> : null}
                    {canManage ? <>
                      <VxButton size="small" variant="text" startIcon={<EditRoundedIcon />} disabled={isSaving} onClick={() => void openMetadataEditor(selectedDocument)}>{t('pages.projectDetails.documentsPanel.metadata')}</VxButton>
                      <VxTooltip title={t('common.delete')}><VxIconButton size="small" color="error" aria-label={`${t('common.delete')}: ${selectedDocument.title}`} disabled={isSaving} onClick={() => setDeleteDocument(selectedDocument)} sx={{ ml: 'auto' }}><DeleteOutlineRoundedIcon fontSize="small" /></VxIconButton></VxTooltip>
                    </> : null}
                  </VxStack>
                </VxStack>
              ) : !isLoading && searchParams.get('document') ? <VxAlert severity="info">{t('pages.projectDetails.documentsPanel.selectionUnavailable')}</VxAlert> : null}

              {isLoading ? (
                <VxBox sx={{ display: 'grid', placeItems: 'center', py: 4 }}><VxCircularProgress size={24} /></VxBox>
              ) : (
                <VxTableContainer>
                  <VxTable size="small">
                    <VxTableHead>
                      <VxTableRow>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.title')}</VxTableCell>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.number')}</VxTableCell>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.file')}</VxTableCell>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.size')}</VxTableCell>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.status')}</VxTableCell>
                        <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.version')}</VxTableCell>
                        <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                      </VxTableRow>
                    </VxTableHead>
                    <VxTableBody>
                      {visibleDocuments.map((document) => (
                        <VxTableRow key={document.id} hover selected={selectedDocumentId === document.id} aria-selected={selectedDocumentId === document.id} onClick={() => updateView('document', document.id)} sx={{ cursor: 'pointer' }}>
                          <VxTableCell><VxButton variant="text" size="small" aria-pressed={selectedDocumentId === document.id} onClick={(event) => { event.stopPropagation(); updateView('document', document.id) }} sx={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', textTransform: 'none', px: 0 }}>{document.title}</VxButton></VxTableCell>
                          <VxTableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{document.documentNumber}</VxTableCell>
                          <VxTableCell>{document.fileName}</VxTableCell>
                          <VxTableCell>{formatBytes(document.fileSizeBytes)}</VxTableCell>
                          <VxTableCell>
                            <VxChip size="small" variant="outlined" label={selectedStatusLabel(document.status)} />
                          </VxTableCell>
                          <VxTableCell>v{document.currentVersionNumber}</VxTableCell>
                          <VxTableCell align="right">
                            <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              {canDownload ? (
                                <>
                                  <VxTooltip title={t('pages.projectDetails.documentsPanel.preview', { defaultValue: 'Preview' })}><VxIconButton size="small" aria-label={`${t('pages.projectDetails.documentsPanel.preview', { defaultValue: 'Preview' })}: ${document.title}`} onClick={(event) => { event.stopPropagation(); void openDocumentFile(document, 'preview') }}><VisibilityRoundedIcon fontSize="small" /></VxIconButton></VxTooltip>
                                  <VxTooltip title={t('pages.projectDetails.documentsPanel.download')}><VxIconButton size="small" aria-label={`${t('pages.projectDetails.documentsPanel.download')}: ${document.title}`} onClick={(event) => { event.stopPropagation(); void openDocumentFile(document, 'download') }}><DownloadRoundedIcon fontSize="small" /></VxIconButton></VxTooltip>
                                </>
                              ) : null}
                            </VxStack>
                          </VxTableCell>
                        </VxTableRow>
                      ))}
                      {visibleDocuments.length === 0 ? (
                        <VxTableRow>
                          <VxTableCell colSpan={7}>
                            <VxTypography color="text.secondary" variant="body2">{t('pages.projectDetails.documentsPanel.noDocuments')}</VxTypography>
                          </VxTableCell>
                        </VxTableRow>
                      ) : null}
                    </VxTableBody>
                  </VxTable>
                </VxTableContainer>
              )}
            </VxStack>
          </VxBox>
      </VxBox>

      {selectedDocument ? (
        <VxPaper elevation={0} className="panel-card">
          <VxStack spacing={1.5}>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
              <VxTypography component="h3" variant="h6">{t('pages.projectDetails.documentsPanel.versions')}</VxTypography>
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <VxChip label={`${t('pages.projectDetails.documentsPanel.columns.number')}: ${selectedDocument.documentNumber}`} variant="outlined" />
              <VxChip label={`${t('pages.projectDetails.documentsPanel.columns.title')}: ${selectedDocument.title}`} variant="outlined" />
              <VxChip label={`${t('pages.projectDetails.documentsPanel.columns.status')}: ${selectedStatusLabel(selectedDocument.status)}`} variant="outlined" />
            </VxStack>
            {canManage ? (
              <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                <VxTextField
                  select
                  size="small"
                  label={t('pages.projectDetails.documentsPanel.nextStatus')}
                  value={nextStatus}
                  onChange={(event) => setNextStatus(Number(event.target.value) as ManagedDocumentStatus)}
                  sx={{ minWidth: 200 }}
                >
                  {statusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`pages.projectDetails.documentsPanel.status.${option.key}`)}</VxMenuItem>)}
                </VxTextField>
                <VxButton
                  variant="contained"
                  disabled={nextStatus === '' || nextStatus === selectedDocument.status || isSaving}
                  onClick={async () => {
                    if (nextStatus === '') return
                    setIsSaving(true)
                    setError(null)
                    setFeedback(null)
                    try {
                      await changeProjectDocumentStatus(projectId, selectedDocument.id, { newStatus: nextStatus })
                      setFeedback(t('pages.projectDetails.documentsPanel.feedback.statusUpdated'))
                      await loadContext()
                    } catch (statusError) {
                      setError(statusError instanceof ApiError ? statusError.message : t('pages.projectDetails.documentsPanel.errors.statusUpdate'))
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                >
                  {t('pages.projectDetails.documentsPanel.applyStatus')}
                </VxButton>
              </VxStack>
            ) : null}
            {versionsError ? <VxAlert severity="error" action={<VxButton onClick={() => setVersionRefresh((previous) => previous + 1)}>{t('common.refresh')}</VxButton>}>{t('pages.projectDetails.documentsPanel.historyError')}</VxAlert> : null}
            {versionsLoading ? <VxBox role="status" aria-label={t('common.labels.loading')} sx={{ py: 2 }}><VxCircularProgress size={20} /></VxBox> : <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.version')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.file')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.size')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.uploadedAt')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {versions.map((version) => (
                    <VxTableRow key={version.id}>
                      <VxTableCell>v{version.versionNumber}</VxTableCell>
                      <VxTableCell>{version.fileName}</VxTableCell>
                      <VxTableCell>{formatBytes(version.fileSizeBytes)}</VxTableCell>
                      <VxTableCell>{new Date(version.uploadedAtUtc).toLocaleString()}</VxTableCell>
                    </VxTableRow>
                  ))}
                  {!versionsError && versions.length === 0 ? <VxTableRow><VxTableCell colSpan={4}>{t('pages.projectDetails.documentsPanel.noVersions')}</VxTableCell></VxTableRow> : null}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>}
          </VxStack>
        </VxPaper>
      ) : null}

      <VxConfirmActionDialog
        open={canManage && deleteDocument !== null}
        title={t('common.delete')}
        targetName={deleteDocument?.title ?? ''}
        consequence={t('pages.deleteConfirmations.projectDocument.consequence')}
        confirmLabel={t('common.delete')}
        pendingLabel={t('dialogs.deleting')}
        pending={isSaving}
        onClose={() => { if (!isSaving) setDeleteDocument(null) }}
        onConfirm={async () => {
          if (!canManage || !deleteDocument || isSaving) return
          const targetId = deleteDocument.id
          setIsSaving(true)
          setError(null)
          setFeedback(null)
          try {
            await deleteProjectDocument(projectId, targetId)
            setDocuments((previous) => previous.filter((document) => document.id !== targetId))
            if (selectedDocumentId === targetId) updateView('document', undefined)
            setFeedback(t('pages.projectDetails.documentsPanel.feedback.documentDeleted'))
            await loadContext()
          } catch (deleteError) {
            setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projectDetails.documentsPanel.errors.documentDelete'))
          } finally {
            setIsSaving(false)
            setDeleteDocument(null)
          }
        }}
      />

      <VxDialog open={folderEditor !== null} onClose={requestFolderClose} maxWidth="sm" fullWidth>
        <VxDialogTitle>{folderEditor?.mode === 'edit' ? t('pages.projectDetails.documentsPanel.editFolder') : t('pages.projectDetails.documentsPanel.newFolder')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField
              size="small"
              label={t('pages.projectDetails.documentsPanel.folderName')}
              value={folderEditor?.name ?? ''}
              onChange={(event) => setFolderEditor((previous) => (previous ? { ...previous, name: event.target.value } : previous))}
              fullWidth
            />
            <VxTextField
              size="small"
              label={t('pages.projectDetails.documentsPanel.description')}
              value={folderEditor?.description ?? ''}
              onChange={(event) => setFolderEditor((previous) => (previous ? { ...previous, description: event.target.value } : previous))}
              fullWidth
              multiline
              minRows={2}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestFolderClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!folderEditor?.name.trim() || isSaving}
            onClick={async () => {
              if (!folderEditor || !folderEditor.name.trim()) return

              setIsSaving(true)
              setError(null)
              setFeedback(null)
              try {
                if (folderEditor.mode === 'create') {
                  await createProjectDocumentFolder(projectId, {
                    parentFolderId: folderEditor.parentFolderId ?? null,
                    name: folderEditor.name.trim(),
                    description: folderEditor.description.trim() || null,
                  })
                  setFeedback(t('pages.projectDetails.documentsPanel.feedback.folderCreated'))
                } else if (folderEditor.folderId) {
                  await updateProjectDocumentFolder(projectId, folderEditor.folderId, {
                    name: folderEditor.name.trim(),
                    description: folderEditor.description.trim() || null,
                  })
                  setFeedback(t('pages.projectDetails.documentsPanel.feedback.folderUpdated'))
                }
                setFolderEditor(null)
                await loadContext()
              } catch (saveError) {
                setError(saveError instanceof ApiError ? saveError.message : t('pages.projectDetails.documentsPanel.errors.folderSave'))
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {folderEditor?.mode === 'edit' ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={uploadDialogOpen} onClose={requestUploadClose} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectDetails.documentsPanel.upload')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.columns.title')} value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} fullWidth />
            <VxTextField select size="small" label={t('pages.projectDetails.documentsPanel.targetFolder')} value={selectedFolderId ?? ''} onChange={(event) => setSelectedFolderId(event.target.value || undefined)} fullWidth>
              <VxMenuItem value="">{t('pages.projectDetails.documentsPanel.rootFolder')}</VxMenuItem>
              {folders.map((folder) => <VxMenuItem key={folder.id} value={folder.id}>{folder.name}</VxMenuItem>)}
            </VxTextField>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.tags')} value={uploadTags} onChange={(event) => setUploadTags(event.target.value)} fullWidth />
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.notes')} value={uploadNotes} onChange={(event) => setUploadNotes(event.target.value)} fullWidth multiline minRows={2} />
            <VxBox>
              <VxTypography variant="caption" color="text.secondary">{t('pages.projectDetails.documentsPanel.columns.file')}</VxTypography>
              <input
                key={uploadFileInputKey}
                type="file"
                onChange={(event) => setUploadFile(event.currentTarget.files?.[0] ?? null)}
                style={{ width: '100%', marginTop: 6 }}
              />
            </VxBox>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestUploadClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!uploadTitle.trim() || !uploadFile || isSaving}
            onClick={async () => {
              if (!uploadFile || !uploadTitle.trim()) return
              setIsSaving(true)
              setError(null)
              setFeedback(null)
              try {
                const uploaded = await uploadProjectDocument(projectId, {
                  title: uploadTitle.trim(),
                  documentFolderId: selectedFolderId,
                  tags: uploadTags.trim() || undefined,
                  notes: uploadNotes.trim() || undefined,
                  file: uploadFile,
                })
                updateView('document', uploaded.id)
                setFeedback(t('pages.projectDetails.documentsPanel.feedback.uploaded'))
                setUploadDialogOpen(false)
                setUploadTitle('')
                setUploadTags('')
                setUploadNotes('')
                setUploadFile(null)
                setUploadFileInputKey((key) => key + 1)
                await loadContext()
              } catch (uploadError) {
                setError(uploadError instanceof ApiError ? uploadError.message : t('pages.projectDetails.documentsPanel.errors.upload'))
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {t('pages.projectDetails.documentsPanel.upload')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={metaEditorOpen && selectedDocument !== null} onClose={requestMetadataClose} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectDetails.documentsPanel.editDocument')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.columns.title')} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} fullWidth />
            <VxTextField select size="small" label={t('pages.projectDetails.documentsPanel.targetFolder')} value={editFolderId} onChange={(event) => setEditFolderId(event.target.value)} fullWidth>
              <VxMenuItem value="">{t('pages.projectDetails.documentsPanel.rootFolder')}</VxMenuItem>
              {folders.map((folder) => <VxMenuItem key={folder.id} value={folder.id}>{folder.name}</VxMenuItem>)}
            </VxTextField>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.tags')} value={editTags} onChange={(event) => setEditTags(event.target.value)} fullWidth />
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.notes')} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} fullWidth multiline minRows={2} />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestMetadataClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!selectedDocument || !editTitle.trim() || isSaving}
            onClick={async () => {
              if (!selectedDocument || !editTitle.trim()) return
              setIsSaving(true)
              setError(null)
              setFeedback(null)
              try {
                await updateProjectDocument(projectId, selectedDocument.id, {
                  title: editTitle.trim(),
                  documentFolderId: editFolderId || null,
                  tags: editTags.trim() || null,
                  notes: editNotes.trim() || null,
                })
                setFeedback(t('pages.projectDetails.documentsPanel.feedback.documentUpdated'))
                setMetaEditorOpen(false)
                await loadContext()
              } catch (updateError) {
                setError(updateError instanceof ApiError ? updateError.message : t('pages.projectDetails.documentsPanel.errors.documentSave'))
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {t('common.save')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={newVersionDialogOpen && selectedDocument !== null} onClose={requestVersionClose} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectDetails.documentsPanel.addVersion')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.notes')} value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} fullWidth multiline minRows={2} />
            <VxBox>
              <VxTypography variant="caption" color="text.secondary">{t('pages.projectDetails.documentsPanel.columns.file')}</VxTypography>
              <input
                key={versionFileInputKey}
                type="file"
                onChange={(event) => setVersionFile(event.currentTarget.files?.[0] ?? null)}
                style={{ width: '100%', marginTop: 6 }}
              />
            </VxBox>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestVersionClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!selectedDocument || !versionFile || isSaving}
            onClick={async () => {
              if (!selectedDocument || !versionFile) return
              setIsSaving(true)
              setError(null)
              setFeedback(null)
              try {
                await addProjectDocumentVersion(projectId, selectedDocument.id, {
                  notes: versionNotes.trim() || undefined,
                  file: versionFile,
                })
                setFeedback(t('pages.projectDetails.documentsPanel.feedback.versionAdded'))
                setNewVersionDialogOpen(false)
                setVersionNotes('')
                setVersionFile(null)
                setVersionFileInputKey((key) => key + 1)
                setVersionRefresh((previous) => previous + 1)
                await loadContext()
              } catch (versionError) {
                setError(versionError instanceof ApiError ? versionError.message : t('pages.projectDetails.documentsPanel.errors.versionUpload'))
              } finally {
                setIsSaving(false)
              }
            }}
          >
            {t('pages.projectDetails.documentsPanel.addVersion')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {folderDiscardDialog}
      {uploadDiscardDialog}
      {metadataDiscardDialog}
      {versionDiscardDialog}
    </VxStack>
  )
}
