import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DeleteOutlineRoundedIcon,
  EditRoundedIcon,
  VxAlert,
  VxButton,
  VxConfirmActionDialog,
  VxChip,
  VxDataGrid,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxGridActionsCellItem,
  type VxGridColDef,
  VxMenuItem,
  VxPaper,
  VxStack,
  VxTextField,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import {
  ApiError,
  createProjectParty,
  deleteProjectParty,
  getProject,
  getProjectCategories,
  getProjectParties,
  getProjectTimeline,
  updateProject,
  updateProjectParty,
} from '../../../lib/api'
import type {
  ProjectCategoryListItemResponse,
  ProjectDetailsResponse,
  ProjectLifecycleStatus,
  ProjectPartyListItemResponse,
  ProjectTimelineItemResponse,
  TenantRelationshipType,
} from '../../../types/api'
import AssignmentsPanel from '../components/AssignmentsPanel'
import DocumentsPanel from '../components/DocumentsPanel'

type ProjectDetailTab = 'overview' | 'parties' | 'assignments' | 'documents' | 'history'

type ProjectFormState = {
  projectCategoryId: string
  projectNumber: string
  name: string
  governmentAgency: string
  submissionReference: string
  startDate: string
  endDate: string
  status: ProjectLifecycleStatus
  notes: string
  isActive: boolean
}

type ProjectPartyFormState = {
  relatedTenantId: string
  relationshipType: TenantRelationshipType
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canAssignPeople: boolean
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

type PartyDataGridProps = {
  rows: ProjectPartyListItemResponse[]
  onEdit: (party: ProjectPartyListItemResponse) => void
  onDelete: (partyId: string) => void
  canManage?: boolean
}

type HistoryDataGridProps = {
  rows: ProjectTimelineItemResponse[]
}

const initialProjectPartyFormState: ProjectPartyFormState = {
  relatedTenantId: '',
  relationshipType: 2,
  canViewDocuments: true,
  canUploadDocuments: false,
  canAssignPeople: false,
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true,
}

function getStatusLabelKey(status: ProjectLifecycleStatus): string {
  switch (status) {
    case 1:
      return 'common.statusLabels.draft'
    case 2:
      return 'common.statusLabels.inReview'
    case 3:
      return 'common.statusLabels.submitted'
    case 4:
      return 'common.statusLabels.awarded'
    case 5:
      return 'common.statusLabels.completed'
    case 6:
      return 'common.statusLabels.cancelled'
    default:
      return 'common.statusLabels.draft'
  }
}

function getRelationshipTypeKey(type: TenantRelationshipType): string {
  switch (type) {
    case 1:
      return 'common.relationshipTypes.primeContractor'
    case 2:
      return 'common.relationshipTypes.subcontractor'
    case 3:
      return 'common.relationshipTypes.legalSponsor'
    case 4:
      return 'common.relationshipTypes.deliveryPartner'
    case 5:
      return 'common.relationshipTypes.customer'
    case 6:
      return 'common.relationshipTypes.vendor'
    case 7:
      return 'common.relationshipTypes.consortiumMember'
    default:
      return 'common.relationshipTypes.subcontractor'
  }
}

function PartyDataGrid({ rows, onEdit, onDelete, canManage = true }: PartyDataGridProps) {
  const { t } = useTranslation()

  const columns: VxGridColDef<ProjectPartyListItemResponse>[] = [
    {
      field: 'relatedTenantId',
      headerName: t('pages.projectDetails.parties.columns.relatedTenant'),
      minWidth: 230,
      flex: 1,
      renderCell: ({ value }) => (
        <VxTypography sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{value}</VxTypography>
      ),
    },
    {
      field: 'relationshipType',
      headerName: t('pages.projectDetails.parties.columns.relationship'),
      minWidth: 180,
      flex: 0.9,
      renderCell: ({ value }) => t(getRelationshipTypeKey(value as TenantRelationshipType)),
    },
    {
      field: 'scope',
      headerName: t('pages.projectDetails.parties.columns.scope'),
      minWidth: 220,
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <VxStack direction="row" spacing={0.75} sx={{ py: 1 }}>
          {row.canViewDocuments ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.viewDocuments')} /> : null}
          {row.canUploadDocuments ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.uploadDocuments')} /> : null}
          {row.canAssignPeople ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.assignPeople')} /> : null}
        </VxStack>
      ),
    },
    {
      field: 'effective',
      headerName: t('pages.projectDetails.parties.columns.effective'),
      minWidth: 200,
      flex: 0.9,
      sortable: false,
      valueGetter: (_value, row) => `${row.effectiveFrom || t('common.labels.any')} - ${row.effectiveTo || t('common.labels.open')}`,
    },
    {
      field: 'isActive',
      headerName: t('pages.projectDetails.parties.columns.active'),
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => (value ? t('common.labels.active') : t('common.labels.inactive')),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('pages.projectDetails.parties.columns.actions'),
      minWidth: 110,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem
          key={`edit-${row.id}`}
          icon={<EditRoundedIcon />}
          label={t('common.edit')}
          onClick={() => onEdit(row)}
          showInMenu={false}
        />,
        <VxGridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label={t('common.delete')}
          onClick={() => onDelete(row.id)}
          showInMenu={false}
        />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="project-parties"
      autoHeight
      rows={rows}
      columns={columns}
      disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{
        pagination: {
          paginationModel: { pageSize: 10, page: 0 },
        },
        sorting: {
          sortModel: [{ field: 'relatedTenantId', sort: 'asc' }],
        },
      }}
      showToolbar
      localeText={{
        noRowsLabel: t('pages.projectDetails.parties.noRecords'),
      }}
      sx={{
        border: 'none',
        '--DataGrid-containerBackground': 'transparent',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: 'rgba(108, 92, 231, 0.06)',
          borderBottom: '1px solid rgba(108, 92, 231, 0.08)',
        },
        '& .MuiDataGrid-cell': {
          borderColor: 'rgba(108, 92, 231, 0.06)',
        },
      }}
      slotProps={{
        toolbar: {
          showQuickFilter: true,
        },
      }}
    />
  )
}

function HistoryDataGrid({ rows }: HistoryDataGridProps) {
  const { t } = useTranslation()

  const columns: VxGridColDef<ProjectTimelineItemResponse>[] = [
    {
      field: 'createdAtUtc',
      headerName: t('pages.projectDetails.history.columns.timestamp'),
      minWidth: 220,
      flex: 1,
      renderCell: ({ value }) => new Date(value as string).toLocaleString(),
    },
    {
      field: 'eventType',
      headerName: t('pages.projectDetails.history.columns.event'),
      minWidth: 180,
      flex: 0.9,
    },
    {
      field: 'description',
      headerName: t('pages.projectDetails.history.columns.description'),
      minWidth: 260,
      flex: 1.4,
      renderCell: ({ value }) => value || t('common.labels.none'),
    },
    {
      field: 'actorUserId',
      headerName: t('pages.projectDetails.history.columns.actor'),
      minWidth: 220,
      flex: 1,
      renderCell: ({ value }) => value || t('common.labels.none'),
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="project-history"
      autoHeight
      rows={rows}
      columns={columns}
      disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{
        pagination: {
          paginationModel: { pageSize: 10, page: 0 },
        },
        sorting: {
          sortModel: [{ field: 'createdAtUtc', sort: 'desc' }],
        },
      }}
      showToolbar
      localeText={{
        noRowsLabel: t('pages.projectDetails.history.noRecords'),
      }}
      sx={{
        border: 'none',
        '--DataGrid-containerBackground': 'transparent',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: 'rgba(108, 92, 231, 0.06)',
          borderBottom: '1px solid rgba(108, 92, 231, 0.08)',
        },
        '& .MuiDataGrid-cell': {
          borderColor: 'rgba(108, 92, 231, 0.06)',
        },
      }}
      slotProps={{
        toolbar: {
          showQuickFilter: true,
        },
      }}
    />
  )
}

export default function ProjectDetailsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.projects.manage) ?? false
  const { projectId } = useParams()
  const location = useLocation()
  const requestedReturnTo = (location.state as { returnTo?: unknown } | null)?.returnTo
  const returnTo = typeof requestedReturnTo === 'string'
    && (requestedReturnTo === '/projects' || requestedReturnTo.startsWith('/projects?') || requestedReturnTo.startsWith('/projects/'))
    ? requestedReturnTo
    : '/projects'
  const [project, setProject] = useState<ProjectDetailsResponse | null>(null)
  const [categories, setCategories] = useState<ProjectCategoryListItemResponse[]>([])
  const [parties, setParties] = useState<ProjectPartyListItemResponse[]>([])
  const [timeline, setTimeline] = useState<ProjectTimelineItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview')

  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false)
  const [projectFormState, setProjectFormState] = useState<ProjectFormState | null>(null)
  const [initialProjectFormState, setInitialProjectFormState] = useState<ProjectFormState | null>(null)
  const [isSavingProject, setIsSavingProject] = useState(false)

  const [isPartyEditorOpen, setIsPartyEditorOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<ProjectPartyListItemResponse | null>(null)
  const [partyFormState, setPartyFormState] = useState<ProjectPartyFormState>(initialProjectPartyFormState)
  const [initialPartyFormState, setInitialPartyFormState] = useState<ProjectPartyFormState | null>(null)
  const [isSavingParty, setIsSavingParty] = useState(false)

  const [deletePartyId, setDeletePartyId] = useState<string | null>(null)
  const [isDeletingParty, setIsDeletingParty] = useState(false)

  const closeProjectEditor = useCallback(() => {
    setIsProjectEditorOpen(false)
    setInitialProjectFormState(null)
  }, [])
  const projectEditorDirty = Boolean(
    projectFormState
    && initialProjectFormState
    && JSON.stringify(projectFormState) !== JSON.stringify(initialProjectFormState),
  )
  const { requestClose: requestProjectEditorClose, confirmationDialog: projectDiscardDialog } = useUnsavedChangesPrompt(
    isProjectEditorOpen && projectEditorDirty,
    isSavingProject,
    closeProjectEditor,
    () => {
      if (initialProjectFormState) setProjectFormState(initialProjectFormState)
    },
  )

  const closePartyEditor = useCallback(() => {
    setIsPartyEditorOpen(false)
    setInitialPartyFormState(null)
  }, [])
  const partyEditorDirty = Boolean(
    initialPartyFormState
    && JSON.stringify(partyFormState) !== JSON.stringify(initialPartyFormState),
  )
  const { requestClose: requestPartyEditorClose, confirmationDialog: partyDiscardDialog } = useUnsavedChangesPrompt(
    isPartyEditorOpen && partyEditorDirty,
    isSavingParty,
    closePartyEditor,
    () => {
      if (initialPartyFormState) setPartyFormState(initialPartyFormState)
    },
  )

  const loadProjectContext = useCallback(async () => {
    if (!isAuthenticated || !projectId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [projectResult, categoryResult, partiesResult, timelineResult] = await Promise.all([
        getProject(projectId),
        getProjectCategories(),
        getProjectParties(projectId),
        getProjectTimeline(projectId),
      ])

      setProject(projectResult)
      setCategories(categoryResult)
      setParties(partiesResult)
      setTimeline(timelineResult)
      const nextProjectFormState = {
        projectCategoryId: projectResult.projectCategoryId,
        projectNumber: projectResult.projectNumber,
        name: projectResult.name,
        governmentAgency: projectResult.governmentAgency || '',
        submissionReference: projectResult.submissionReference || '',
        startDate: projectResult.startDate,
        endDate: projectResult.endDate || '',
        status: projectResult.status,
        notes: projectResult.notes || '',
        isActive: projectResult.isActive,
      }
      setProjectFormState(nextProjectFormState)
      setInitialProjectFormState(nextProjectFormState)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectDetails.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, projectId, t])

  useEffect(() => {
    void loadProjectContext()
  }, [loadProjectContext])

  const categoryLabelById = useMemo(() => new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])), [categories])

  const statusOptions: Array<{ value: ProjectLifecycleStatus, label: string }> = [
    { value: 1, label: t('common.statusLabels.draft') },
    { value: 2, label: t('common.statusLabels.inReview') },
    { value: 3, label: t('common.statusLabels.submitted') },
    { value: 4, label: t('common.statusLabels.awarded') },
    { value: 5, label: t('common.statusLabels.completed') },
    { value: 6, label: t('common.statusLabels.cancelled') },
  ]

  const relationshipOptions: Array<{ value: TenantRelationshipType, label: string }> = [
    { value: 1, label: t('common.relationshipTypes.primeContractor') },
    { value: 2, label: t('common.relationshipTypes.subcontractor') },
    { value: 3, label: t('common.relationshipTypes.legalSponsor') },
    { value: 4, label: t('common.relationshipTypes.deliveryPartner') },
    { value: 5, label: t('common.relationshipTypes.customer') },
    { value: 6, label: t('common.relationshipTypes.vendor') },
    { value: 7, label: t('common.relationshipTypes.consortiumMember') },
  ]

  const handleProjectSave = async () => {
    if (!canManage || !projectId || !projectFormState) {
      return
    }

    setIsSavingProject(true)
    setError(null)
    setFeedback(null)

    try {
      await updateProject(projectId, {
        projectCategoryId: projectFormState.projectCategoryId,
        projectNumber: projectFormState.projectNumber.trim(),
        name: projectFormState.name.trim(),
        governmentAgency: projectFormState.governmentAgency.trim() || null,
        submissionReference: projectFormState.submissionReference.trim() || null,
        startDate: projectFormState.startDate,
        endDate: projectFormState.endDate || null,
        status: projectFormState.status,
        notes: projectFormState.notes.trim() || null,
        isActive: projectFormState.isActive,
      })
      setIsProjectEditorOpen(false)
      setFeedback(t('pages.projectDetails.feedback.updated'))
      await loadProjectContext()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.projectDetails.errors.save'))
    } finally {
      setIsSavingProject(false)
    }
  }

  const openCreatePartyDialog = () => {
    if (!canManage) return
    setEditingParty(null)
    setPartyFormState(initialProjectPartyFormState)
    setInitialPartyFormState(initialProjectPartyFormState)
    setIsPartyEditorOpen(true)
  }

  const openEditPartyDialog = (party: ProjectPartyListItemResponse) => {
    if (!canManage) return
    setEditingParty(party)
    const nextPartyFormState = {
      relatedTenantId: party.relatedTenantId,
      relationshipType: party.relationshipType,
      canViewDocuments: party.canViewDocuments,
      canUploadDocuments: party.canUploadDocuments,
      canAssignPeople: party.canAssignPeople,
      effectiveFrom: party.effectiveFrom || '',
      effectiveTo: party.effectiveTo || '',
      isActive: party.isActive,
    }
    setPartyFormState(nextPartyFormState)
    setInitialPartyFormState(nextPartyFormState)
    setIsPartyEditorOpen(true)
  }

  const handlePartySave = async () => {
    if (!canManage || !projectId || !partyFormState.relatedTenantId.trim()) {
      return
    }

    setIsSavingParty(true)
    setError(null)
    setFeedback(null)

    try {
      const payload = {
        relatedTenantId: partyFormState.relatedTenantId.trim(),
        relationshipType: partyFormState.relationshipType,
        canViewDocuments: partyFormState.canViewDocuments,
        canUploadDocuments: partyFormState.canUploadDocuments,
        canAssignPeople: partyFormState.canAssignPeople,
        effectiveFrom: partyFormState.effectiveFrom || null,
        effectiveTo: partyFormState.effectiveTo || null,
      }

      if (editingParty) {
        await updateProjectParty(projectId, editingParty.id, {
          ...payload,
          isActive: partyFormState.isActive,
        })
        setFeedback(t('pages.projectDetails.feedback.partyUpdated'))
      } else {
        await createProjectParty(projectId, payload)
        setFeedback(t('pages.projectDetails.feedback.partyAdded'))
      }

      setIsPartyEditorOpen(false)
      await loadProjectContext()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.projectDetails.errors.partySave'))
    } finally {
      setIsSavingParty(false)
    }
  }

  const handlePartyDelete = async () => {
    if (!canManage || !projectId || !deletePartyId) {
      return
    }

    setIsDeletingParty(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteProjectParty(projectId, deletePartyId)
      setDeletePartyId(null)
      setFeedback(t('pages.projectDetails.feedback.partyRemoved'))
      await loadProjectContext()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projectDetails.errors.partyDelete'))
    } finally {
      setIsDeletingParty(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.projects.signInRequired')}</VxAlert>
  }

  if (!projectId) {
    return <VxAlert severity="error">{t('pages.projectDetails.errors.load')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={project?.name || t('pages.projectDetails.title')}
        description={`${t('pages.projectDetails.projectIdLabel')}: ${projectId}`}
        primaryAction={(
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <VxButton variant="outlined" component={RouterLink} to={returnTo}>{t('pages.projectDetails.backButton')}</VxButton>
            {canManage ? <VxButton variant="contained" onClick={() => setIsProjectEditorOpen(true)} disabled={!projectFormState}>{t('pages.projectDetails.editButton')}</VxButton> : null}
          </VxStack>
        )}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadProjectContext() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.projects.manage} /> : null}

      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <VxButton variant={activeTab === 'overview' ? 'contained' : 'outlined'} aria-pressed={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>{t('pages.projectDetails.tabs.overview')}</VxButton>
          <VxButton variant={activeTab === 'parties' ? 'contained' : 'outlined'} aria-pressed={activeTab === 'parties'} onClick={() => setActiveTab('parties')}>{t('pages.projectDetails.tabs.parties')}</VxButton>
          <VxButton variant={activeTab === 'assignments' ? 'contained' : 'outlined'} aria-pressed={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>{t('pages.projectDetails.tabs.assignments')}</VxButton>
          <VxButton variant={activeTab === 'documents' ? 'contained' : 'outlined'} aria-pressed={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>{t('pages.projectDetails.tabs.documents')}</VxButton>
          <VxButton variant={activeTab === 'history' ? 'contained' : 'outlined'} aria-pressed={activeTab === 'history'} onClick={() => setActiveTab('history')}>{t('pages.projectDetails.tabs.history')}</VxButton>
        </VxStack>
      </VxPaper>

      {isLoading ? (
        <VxPaper elevation={0} className="panel-card">
          <PageLoadingState label={t('common.labels.loading')} />
        </VxPaper>
      ) : null}

      {activeTab === 'overview' && project ? (
        <VxPaper elevation={0} className="panel-card">
          <VxStack spacing={2}>
            <VxTypography component="h2" variant="h6">{t('pages.projectDetails.overview.title')}</VxTypography>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <PageMetric label={t('pages.projectDetails.overview.projectNumber')} value={project.projectNumber} />
              <PageMetric label={t('pages.projectDetails.overview.category')} value={categoryLabelById.get(project.projectCategoryId) || project.projectCategoryId} />
              <PageMetric label={t('pages.projectDetails.overview.status')} value={t(getStatusLabelKey(project.status))} />
            </VxStack>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.governmentAgency')}: {project.governmentAgency || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.submissionReference')}: {project.submissionReference || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.duration')}: {project.startDate} - {project.endDate || t('common.labels.open')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.notes')}: {project.notes || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.isActive')}: {project.isActive ? t('common.labels.active') : t('common.labels.inactive')}</VxTypography>
          </VxStack>
        </VxPaper>
      ) : null}

      {activeTab === 'parties' ? (
        <VxPaper elevation={0} className="panel-card" sx={{ p: 0 }}>
          <VxStack spacing={2} sx={{ px: 2.5, pt: 2.5 }}>
            <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <VxTypography component="h2" variant="h6">{t('pages.projectDetails.parties.title')}</VxTypography>
              {canManage ? <VxButton variant="contained" onClick={openCreatePartyDialog}>{t('pages.projectDetails.parties.addButton')}</VxButton> : null}
            </VxStack>
            <VxAlert severity="info">{t('pages.projectDetails.parties.description')}</VxAlert>
          </VxStack>
          <PartyDataGrid
            rows={parties}
            onEdit={openEditPartyDialog}
            onDelete={(partyId) => setDeletePartyId(partyId)}
            canManage={canManage}
          />
        </VxPaper>
      ) : null}

      {activeTab === 'assignments' ? (
        <AssignmentsPanel projectId={projectId} />
      ) : null}

      {activeTab === 'documents' ? (
        <DocumentsPanel projectId={projectId} />
      ) : null}

      {activeTab === 'history' ? (
        <VxPaper elevation={0} className="panel-card" sx={{ p: 0 }}>
          <VxStack sx={{ px: 2.5, pt: 2.5 }}>
            <VxTypography component="h2" variant="h6">{t('pages.projectDetails.history.title')}</VxTypography>
          </VxStack>
          <HistoryDataGrid rows={timeline} />
        </VxPaper>
      ) : null}

      <VxDialog open={canManage && isProjectEditorOpen} onClose={requestProjectEditorClose} maxWidth="md" fullWidth>
        <VxDialogTitle>{t('pages.projectDetails.editButton')}</VxDialogTitle>
        <VxDialogContent>
          {projectFormState ? (
            <VxStack spacing={2} sx={{ mt: 1 }}>
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.overview.category')}
                value={projectFormState.projectCategoryId}
                onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, projectCategoryId: event.target.value } : previous)}
                fullWidth
              >
                {categories.map((category) => (
                  <VxMenuItem key={category.id} value={category.id}>
                    {categoryLabelById.get(category.id)}
                  </VxMenuItem>
                ))}
              </VxTextField>

              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <VxTextField
                  size="small"
                  label={t('pages.projectDetails.overview.projectNumber')}
                  value={projectFormState.projectNumber}
                  onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, projectNumber: event.target.value } : previous)}
                  fullWidth
                />
                <VxTextField
                  size="small"
                  label={t('pages.projects.fields.projectName')}
                  value={projectFormState.name}
                  onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, name: event.target.value } : previous)}
                  fullWidth
                />
              </VxStack>

              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <VxTextField
                  size="small"
                  label={t('pages.projects.fields.startDate')}
                  type="date"
                  value={projectFormState.startDate}
                  onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, startDate: event.target.value } : previous)}
                  fullWidth
                />
                <VxTextField
                  size="small"
                  label={t('pages.projects.fields.endDate')}
                  type="date"
                  value={projectFormState.endDate}
                  onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, endDate: event.target.value } : previous)}
                  fullWidth
                />
              </VxStack>

              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.overview.status')}
                value={projectFormState.status}
                onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, status: Number(event.target.value) as ProjectLifecycleStatus } : previous)}
                fullWidth
              >
                {statusOptions.map((option) => (
                  <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
                ))}
              </VxTextField>

              <VxTextField
                size="small"
                label={t('pages.projectDetails.overview.notes')}
                value={projectFormState.notes}
                onChange={(event) => setProjectFormState((previous) => previous ? { ...previous, notes: event.target.value } : previous)}
                multiline
                minRows={3}
                fullWidth
              />
            </VxStack>
          ) : null}
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestProjectEditorClose}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleProjectSave()} disabled={!projectFormState || isSavingProject}>{t('common.save')}</VxButton>
        </VxDialogActions>
      </VxDialog>
      {projectDiscardDialog}

      <VxDialog open={canManage && isPartyEditorOpen} onClose={requestPartyEditorClose} maxWidth="sm" fullWidth>
        <VxDialogTitle>{editingParty ? t('pages.projectDetails.parties.dialogs.edit') : t('pages.projectDetails.parties.dialogs.add')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxAlert severity="info">{t('pages.projectDetails.parties.dialogGuidance')}</VxAlert>
            <VxTextField
              size="small"
              label={t('pages.projectDetails.parties.fields.relatedTenantId')}
              value={partyFormState.relatedTenantId}
              onChange={(event) => setPartyFormState((previous) => ({ ...previous, relatedTenantId: event.target.value }))}
              placeholder={t('pages.projectDetails.parties.fields.tenantIdPlaceholder')}
              helperText={t('pages.projectDetails.parties.fields.relatedTenantHelp')}
              fullWidth
            />

            <VxTextField
              select
              size="small"
              label={t('pages.projectDetails.parties.fields.relationshipType')}
              value={partyFormState.relationshipType}
              onChange={(event) => setPartyFormState((previous) => ({ ...previous, relationshipType: Number(event.target.value) as TenantRelationshipType }))}
              fullWidth
            >
              {relationshipOptions.map((option) => (
                <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
              ))}
            </VxTextField>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.parties.fields.canViewDocuments')}
                value={partyFormState.canViewDocuments ? 'true' : 'false'}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, canViewDocuments: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.parties.fields.canUploadDocuments')}
                value={partyFormState.canUploadDocuments ? 'true' : 'false'}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, canUploadDocuments: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.parties.fields.canAssignPeople')}
                value={partyFormState.canAssignPeople ? 'true' : 'false'}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, canAssignPeople: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.parties.fields.isActive')}
                value={partyFormState.isActive ? 'true' : 'false'}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, isActive: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                label={t('pages.projectDetails.parties.fields.effectiveFrom')}
                type="date"
                value={partyFormState.effectiveFrom}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, effectiveFrom: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                label={t('pages.projectDetails.parties.fields.effectiveTo')}
                type="date"
                value={partyFormState.effectiveTo}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, effectiveTo: event.target.value }))}
                fullWidth
              />
            </VxStack>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestPartyEditorClose}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handlePartySave()} disabled={isSavingParty || !partyFormState.relatedTenantId.trim()}>
            {editingParty ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {partyDiscardDialog}

      <VxConfirmActionDialog open={canManage && Boolean(deletePartyId)} title={t('pages.projectDetails.parties.dialogs.delete.title')} targetName={parties.find((party) => party.id === deletePartyId)?.relatedTenantId ?? ''} consequence={t('pages.projectDetails.parties.dialogs.delete.message')} confirmLabel={t('common.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeletingParty} onClose={() => setDeletePartyId(null)} onConfirm={() => void handlePartyDelete()} />
    </VxStack>
  )
}
