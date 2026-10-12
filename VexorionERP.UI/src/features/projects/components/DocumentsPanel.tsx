import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  VxAlert,
  VxBox,
  VxButton,
  VxChip,
  VxCircularProgress,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
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
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import {
  ApiError,
  addProjectDocumentVersion,
  changeProjectDocumentStatus,
  createProjectDocumentFolder,
  deleteProjectDocument,
  deleteProjectDocumentFolder,
  getProjectDocumentDownload,
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

  const canView = user?.permissions.includes('project-documents.view') ?? false
  const canUpload = user?.permissions.includes('project-documents.upload') ?? false
  const canDownload = user?.permissions.includes('project-documents.download') ?? false
  const canManage = user?.permissions.includes('project-documents.manage') ?? false

  const [folders, setFolders] = useState<DocumentFolderListItemResponse[]>([])
  const [documents, setDocuments] = useState<ProjectDocumentListItemResponse[]>([])
  const [versions, setVersions] = useState<ProjectDocumentVersionListItemResponse[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>()
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<ManagedDocumentStatus | ''>('')
  const [searchTerm, setSearchTerm] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [folderEditor, setFolderEditor] = useState<FolderEditorState | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [metaEditorOpen, setMetaEditorOpen] = useState(false)

  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [versionNotes, setVersionNotes] = useState('')
  const [versionFile, setVersionFile] = useState<File | null>(null)

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  )

  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editFolderId, setEditFolderId] = useState<string | ''>('')
  const [nextStatus, setNextStatus] = useState<ManagedDocumentStatus | ''>('')

  const visibleDocuments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    return documents.filter((item) => {
      if (selectedFolderId && item.documentFolderId !== selectedFolderId) return false
      if (statusFilter !== '' && item.status !== statusFilter) return false
      if (!normalized) return true
      return (
        item.title.toLowerCase().includes(normalized)
        || item.fileName.toLowerCase().includes(normalized)
        || item.documentNumber.toLowerCase().includes(normalized)
        || (item.tags?.toLowerCase().includes(normalized) ?? false)
      )
    })
  }, [documents, searchTerm, selectedFolderId, statusFilter])

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
      if (!selectedDocumentId && documentResult.length > 0) {
        setSelectedDocumentId(documentResult[0].id)
      }
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectDetails.documentsPanel.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [canView, projectId, selectedDocumentId, t])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  useEffect(() => {
    if (!selectedDocumentId) {
      setVersions([])
      return
    }

    const loadVersions = async () => {
      try {
        const result = await getProjectDocumentVersions(projectId, selectedDocumentId)
        setVersions(result)
      } catch {
        setVersions([])
      }
    }

    void loadVersions()
  }, [projectId, selectedDocumentId])

  useEffect(() => {
    if (!selectedDocument) return
    setEditTitle(selectedDocument.title)
    setEditTags(selectedDocument.tags ?? '')
    setEditNotes('')
    setEditFolderId(selectedDocument.documentFolderId ?? '')
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
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', pl: depth * 2, py: 0.5 }}>
          <VxButton
            size="small"
            variant={selectedFolderId === folder.id ? 'contained' : 'text'}
            onClick={() => setSelectedFolderId((prev) => (prev === folder.id ? undefined : folder.id))}
          >
            {folder.name}
          </VxButton>
          {canManage ? (
            <>
              <VxButton size="small" variant="text" onClick={() => setFolderEditor({ mode: 'edit', folderId: folder.id, parentFolderId: folder.parentFolderId ?? null, name: folder.name, description: folder.description ?? '' })}>
                {t('common.edit')}
              </VxButton>
              <VxButton
                size="small"
                color="error"
                variant="text"
                onClick={async () => {
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
                {t('common.delete')}
              </VxButton>
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

      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          <VxPaper elevation={0} className="products-metric-card" sx={{ minWidth: { xs: '100%', lg: 280 }, p: 1.5 }}>
            <VxStack spacing={1}>
              <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <VxTypography variant="subtitle1">{t('pages.projectDetails.documentsPanel.folders')}</VxTypography>
                {canManage ? (
                  <VxButton size="small" variant="contained" onClick={() => setFolderEditor({ mode: 'create', parentFolderId: selectedFolderId ?? null, name: '', description: '' })}>
                    {t('pages.projectDetails.documentsPanel.newFolder')}
                  </VxButton>
                ) : null}
              </VxStack>
              <VxButton size="small" variant={selectedFolderId ? 'outlined' : 'contained'} onClick={() => setSelectedFolderId(undefined)}>
                {t('pages.projectDetails.documentsPanel.allFolders')}
              </VxButton>
              <VxBox sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                {folders.length === 0 ? (
                  <VxTypography color="text.secondary" variant="body2">{t('pages.projectDetails.documentsPanel.noFolders')}</VxTypography>
                ) : renderFolderTree(null, 0)}
              </VxBox>
            </VxStack>
          </VxPaper>

          <VxBox sx={{ flex: 1 }}>
            <VxStack spacing={1.5}>
              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <VxTextField
                    size="small"
                    label={t('pages.projectDetails.documentsPanel.search')}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <VxTextField
                    select
                    size="small"
                    label={t('pages.projectDetails.documentsPanel.statusFilter')}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value === '' ? '' : Number(event.target.value) as ManagedDocumentStatus)}
                    sx={{ minWidth: 180 }}
                  >
                    <VxMenuItem value="">{t('pages.projectDetails.documentsPanel.allStatuses')}</VxMenuItem>
                    {statusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`pages.projectDetails.documentsPanel.status.${option.key}`)}</VxMenuItem>)}
                  </VxTextField>
                </VxStack>
                {canUpload ? (
                  <VxButton variant="contained" onClick={() => setUploadDialogOpen(true)}>
                    {t('pages.projectDetails.documentsPanel.upload')}
                  </VxButton>
                ) : null}
              </VxStack>

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
                        <VxTableRow key={document.id} hover selected={selectedDocumentId === document.id} onClick={() => setSelectedDocumentId(document.id)} sx={{ cursor: 'pointer' }}>
                          <VxTableCell>{document.title}</VxTableCell>
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
                                  <VxButton
                                    size="small"
                                    variant="text"
                                    onClick={async (event) => {
                                      event.stopPropagation()
                                      try {
                                        const result = await getProjectDocumentDownload(projectId, document.id)
                                        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
                                      } catch (downloadError) {
                                        setError(downloadError instanceof ApiError ? downloadError.message : t('pages.projectDetails.documentsPanel.errors.download'))
                                      }
                                    }}
                                  >
                                    {t('pages.projectDetails.documentsPanel.preview', { defaultValue: 'Preview' })}
                                  </VxButton>
                                  <VxButton
                                    size="small"
                                    variant="outlined"
                                    onClick={async (event) => {
                                      event.stopPropagation()
                                      try {
                                        const result = await getProjectDocumentDownload(projectId, document.id)
                                        const anchor = window.document.createElement('a')
                                        anchor.href = result.downloadUrl
                                        anchor.target = '_blank'
                                        anchor.rel = 'noopener noreferrer'
                                        anchor.download = result.fileName
                                        window.document.body.appendChild(anchor)
                                        anchor.click()
                                        window.document.body.removeChild(anchor)
                                      } catch (downloadError) {
                                        setError(downloadError instanceof ApiError ? downloadError.message : t('pages.projectDetails.documentsPanel.errors.download'))
                                      }
                                    }}
                                  >
                                    {t('pages.projectDetails.documentsPanel.download')}
                                  </VxButton>
                                </>
                              ) : null}
                              {canManage ? (
                                <>
                                  <VxButton size="small" variant="text" onClick={(event) => { event.stopPropagation(); setMetaEditorOpen(true) }}>
                                    {t('common.edit')}
                                  </VxButton>
                                  <VxButton
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={async (event) => {
                                      event.stopPropagation()
                                      setIsSaving(true)
                                      setError(null)
                                      setFeedback(null)
                                      try {
                                        await deleteProjectDocument(projectId, document.id)
                                        setFeedback(t('pages.projectDetails.documentsPanel.feedback.documentDeleted'))
                                        setSelectedDocumentId(undefined)
                                        await loadContext()
                                      } catch (deleteError) {
                                        setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projectDetails.documentsPanel.errors.documentDelete'))
                                      } finally {
                                        setIsSaving(false)
                                      }
                                    }}
                                  >
                                    {t('common.delete')}
                                  </VxButton>
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
        </VxStack>
      </VxPaper>

      {selectedDocument ? (
        <VxPaper elevation={0} className="panel-card">
          <VxStack spacing={1.5}>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
              <VxTypography variant="h6">{t('pages.projectDetails.documentsPanel.versions')}</VxTypography>
              {canUpload ? (
                <VxButton variant="outlined" onClick={() => setNewVersionDialogOpen(true)}>{t('pages.projectDetails.documentsPanel.addVersion')}</VxButton>
              ) : null}
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
            <VxTableContainer>
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
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          </VxStack>
        </VxPaper>
      ) : null}

      <VxDialog open={folderEditor !== null} onClose={isSaving ? undefined : () => setFolderEditor(null)} maxWidth="sm" fullWidth>
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
          <VxButton onClick={() => setFolderEditor(null)}>{t('common.cancel')}</VxButton>
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

      <VxDialog open={uploadDialogOpen} onClose={isSaving ? undefined : () => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
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
                type="file"
                onChange={(event) => setUploadFile(event.currentTarget.files?.[0] ?? null)}
                style={{ width: '100%', marginTop: 6 }}
              />
            </VxBox>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setUploadDialogOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!uploadTitle.trim() || !uploadFile || isSaving}
            onClick={async () => {
              if (!uploadFile || !uploadTitle.trim()) return
              setIsSaving(true)
              setError(null)
              setFeedback(null)
              try {
                await uploadProjectDocument(projectId, {
                  title: uploadTitle.trim(),
                  documentFolderId: selectedFolderId,
                  tags: uploadTags.trim() || undefined,
                  notes: uploadNotes.trim() || undefined,
                  file: uploadFile,
                })
                setFeedback(t('pages.projectDetails.documentsPanel.feedback.uploaded'))
                setUploadDialogOpen(false)
                setUploadTitle('')
                setUploadTags('')
                setUploadNotes('')
                setUploadFile(null)
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

      <VxDialog open={metaEditorOpen && selectedDocument !== null} onClose={isSaving ? undefined : () => setMetaEditorOpen(false)} maxWidth="sm" fullWidth>
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
          <VxButton onClick={() => setMetaEditorOpen(false)}>{t('common.cancel')}</VxButton>
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

      <VxDialog open={newVersionDialogOpen && selectedDocument !== null} onClose={isSaving ? undefined : () => setNewVersionDialogOpen(false)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectDetails.documentsPanel.addVersion')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField size="small" label={t('pages.projectDetails.documentsPanel.notes')} value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} fullWidth multiline minRows={2} />
            <VxBox>
              <VxTypography variant="caption" color="text.secondary">{t('pages.projectDetails.documentsPanel.columns.file')}</VxTypography>
              <input
                type="file"
                onChange={(event) => setVersionFile(event.currentTarget.files?.[0] ?? null)}
                style={{ width: '100%', marginTop: 6 }}
              />
            </VxBox>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setNewVersionDialogOpen(false)}>{t('common.cancel')}</VxButton>
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
    </VxStack>
  )
}
