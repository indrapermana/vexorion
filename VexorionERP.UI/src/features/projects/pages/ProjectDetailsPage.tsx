import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  VxAlert,
  VxAutocomplete,
  VxButton,
  VxConfirmActionDialog,
  VxCheckbox,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxFormControlLabel,
  VxMenuItem,
  VxPaper,
  VxStack,
  VxTab,
  VxTabs,
  VxTextField,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useParams, useSearchParams } from 'react-router-dom'
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
  getProjectPartyOptions,
  getProjectTimeline,
  updateProject,
  updateProjectParty,
} from '../../../lib/api'
import type {
  ProjectCategoryListItemResponse,
  ProjectDetailsResponse,
  ProjectLifecycleStatus,
  ProjectPartyListItemResponse,
  ProjectPartyOptionResponse,
  ProjectTimelineItemResponse,
  TenantRelationshipType,
} from '../../../types/api'
import AssignmentsPanel from '../components/AssignmentsPanel'
import DocumentsPanel from '../components/DocumentsPanel'
import ProjectHistoryDataGrid from '../components/ProjectHistoryDataGrid'
import ProjectPartyDataGrid from '../components/ProjectPartyDataGrid'
import ProjectTabPanel, { type ProjectDetailTab } from '../components/ProjectTabPanel'
import { getProjectStatusLabelKey, getRelationshipTypeLabelKey } from '../projectPresentation'

const projectDetailTabs: ProjectDetailTab[] = ['overview', 'parties', 'assignments', 'documents', 'history']

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

export default function ProjectDetailsPage() {
  const { projectId } = useParams()
  return <ProjectDetailsContent key={projectId} />
}

function ProjectDetailsContent() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.projects.manage) ?? false
  const { projectId } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigationContext = location.state as { returnTo?: unknown, returnState?: unknown } | null
  const requestedReturnTo = navigationContext?.returnTo
  const returnTo = typeof requestedReturnTo === 'string'
    && (requestedReturnTo === '/projects' || requestedReturnTo.startsWith('/projects?') || requestedReturnTo.startsWith('/projects/') || requestedReturnTo === '/project-documents' || requestedReturnTo.startsWith('/project-documents?'))
    ? requestedReturnTo
    : '/projects'
  const [project, setProject] = useState<ProjectDetailsResponse | null>(null)
  const [categories, setCategories] = useState<ProjectCategoryListItemResponse[]>([])
  const [parties, setParties] = useState<ProjectPartyListItemResponse[]>([])
  const [partyOptions, setPartyOptions] = useState<ProjectPartyOptionResponse[]>([])
  const [partyOptionsLoading, setPartyOptionsLoading] = useState(false)
  const [partyOptionsError, setPartyOptionsError] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<ProjectTimelineItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const requestedTab = searchParams.get('tab') as ProjectDetailTab | null
  const activeTab = requestedTab && projectDetailTabs.includes(requestedTab) ? requestedTab : 'overview'
  const [visitedTabs, setVisitedTabs] = useState<Set<ProjectDetailTab>>(() => new Set([activeTab]))

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

  const loadPartyOptions = useCallback(async () => {
    if (!isAuthenticated || !canManage || !projectId) return
    setPartyOptionsLoading(true)
    setPartyOptionsError(null)
    try {
      setPartyOptions(await getProjectPartyOptions(projectId))
    } catch {
      setPartyOptions([])
      setPartyOptionsError(t('pages.projectDetails.parties.optionsError'))
    } finally {
      setPartyOptionsLoading(false)
    }
  }, [canManage, isAuthenticated, projectId, t])

  useEffect(() => { void loadPartyOptions() }, [loadPartyOptions])

  const categoryLabelById = useMemo(() => new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])), [categories])

  const statusOptions: Array<{ value: ProjectLifecycleStatus, label: string }> = [
    { value: 1, label: t('common.statusLabels.draft') },
    { value: 2, label: t('common.statusLabels.inReview') },
    { value: 3, label: t('common.statusLabels.submitted') },
    { value: 4, label: t('common.statusLabels.awarded') },
    { value: 5, label: t('common.statusLabels.completed') },
    { value: 6, label: t('common.statusLabels.cancelled') },
  ]

  const newPartyOptions = partyOptions.filter((option) => !parties.some((party) => party.relatedTenantId === option.relatedTenantId && party.relationshipType === option.relationshipType))
  const availablePartyOptions = editingParty ? partyOptions.filter((option) => !parties.some((party) => party.id !== editingParty.id && party.relatedTenantId === option.relatedTenantId && party.relationshipType === option.relationshipType)) : newPartyOptions
  const selectedPartyOption = availablePartyOptions.find((option) => option.relatedTenantId === partyFormState.relatedTenantId && option.relationshipType === partyFormState.relationshipType)
  const partyPeriodInvalid = Boolean(
    (partyFormState.effectiveFrom && partyFormState.effectiveTo && partyFormState.effectiveFrom > partyFormState.effectiveTo)
    || (selectedPartyOption?.effectiveFrom && ((partyFormState.effectiveFrom && partyFormState.effectiveFrom < selectedPartyOption.effectiveFrom) || (partyFormState.effectiveTo && partyFormState.effectiveTo < selectedPartyOption.effectiveFrom)))
    || (selectedPartyOption?.effectiveTo && ((partyFormState.effectiveFrom && partyFormState.effectiveFrom > selectedPartyOption.effectiveTo) || (partyFormState.effectiveTo && partyFormState.effectiveTo > selectedPartyOption.effectiveTo))),
  )
  const partyScopeInvalid = selectedPartyOption && (
    (partyFormState.canViewDocuments && !selectedPartyOption.canViewDocuments)
    || (partyFormState.canUploadDocuments && !selectedPartyOption.canUploadDocuments)
    || (partyFormState.canAssignPeople && !selectedPartyOption.canAssignPeople)
  )

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
    if (!canManage || !projectId || !selectedPartyOption || partyPeriodInvalid || partyScopeInvalid || partyOptionsLoading || partyOptionsError) {
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
            <VxButton variant="outlined" component={RouterLink} to={returnTo} state={navigationContext?.returnState}>{returnTo.startsWith('/project-documents') ? t('pages.projectDocuments.backToCenter') : t('pages.projectDetails.backButton')}</VxButton>
            {canManage ? <VxButton variant="contained" onClick={() => setIsProjectEditorOpen(true)} disabled={!projectFormState}>{t('pages.projectDetails.editButton')}</VxButton> : null}
          </VxStack>
        )}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadProjectContext() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.projects.manage} /> : null}

      <VxTabs
        value={activeTab}
        onChange={(_, tab: ProjectDetailTab) => {
          setSearchParams((current) => {
            const next = new URLSearchParams(current)
            if (tab === 'overview') next.delete('tab')
            else next.set('tab', tab)
            return next
          }, { replace: true })
          setVisitedTabs((previous) => new Set([...previous, activeTab, tab]))
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={t('pages.projectDetails.title')}
        sx={{ minWidth: 0, maxWidth: '100%', borderBottom: 1, borderColor: 'divider' }}
      >
        {projectDetailTabs.map((tab) => (
          <VxTab key={tab} value={tab} id={`project-tab-${tab}`} aria-controls={`project-panel-${tab}`} label={t(`pages.projectDetails.tabs.${tab}`)} />
        ))}
      </VxTabs>

      {isLoading ? (
        <VxPaper elevation={0} className="panel-card">
          <PageLoadingState label={t('common.labels.loading')} />
        </VxPaper>
      ) : null}

      <ProjectTabPanel tab="overview" activeTab={activeTab}>
      {project ? (
        <VxPaper elevation={0} className="panel-card">
          <VxStack spacing={2}>
            <VxTypography component="h2" variant="h6">{t('pages.projectDetails.overview.title')}</VxTypography>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <PageMetric label={t('pages.projectDetails.overview.projectNumber')} value={project.projectNumber} />
              <PageMetric label={t('pages.projectDetails.overview.category')} value={categoryLabelById.get(project.projectCategoryId) || project.projectCategoryId} />
              <PageMetric label={t('pages.projectDetails.overview.status')} value={t(getProjectStatusLabelKey(project.status))} />
            </VxStack>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.governmentAgency')}: {project.governmentAgency || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.submissionReference')}: {project.submissionReference || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.duration')}: {project.startDate} - {project.endDate || t('common.labels.open')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.notes')}: {project.notes || t('common.labels.none')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.projectDetails.overview.isActive')}: {project.isActive ? t('common.labels.active') : t('common.labels.inactive')}</VxTypography>
          </VxStack>
        </VxPaper>
      ) : null}
      </ProjectTabPanel>

      <ProjectTabPanel tab="parties" activeTab={activeTab}>
      {visitedTabs.has('parties') ? (
        <VxPaper elevation={0} className="panel-card" sx={{ p: 0 }}>
          <VxStack spacing={2} sx={{ px: 2.5, pt: 2.5 }}>
            <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <VxTypography component="h2" variant="h6">{t('pages.projectDetails.parties.title')}</VxTypography>
              {canManage ? <VxButton variant="contained" disabled={partyOptionsLoading || Boolean(partyOptionsError) || newPartyOptions.length === 0} onClick={openCreatePartyDialog}>{t('pages.projectDetails.parties.addButton')}</VxButton> : null}
            </VxStack>
            <VxAlert severity="info">{t('pages.projectDetails.parties.description')}</VxAlert>
            {partyOptionsError ? <VxAlert severity="error" action={<VxButton disabled={partyOptionsLoading} onClick={() => void loadPartyOptions()}>{t('common.refresh')}</VxButton>}>{partyOptionsError}</VxAlert> : null}
            {canManage && !partyOptionsLoading && !partyOptionsError && newPartyOptions.length === 0 ? <VxAlert severity="info">{t('pages.projectDetails.parties.noEligiblePartners')}</VxAlert> : null}
          </VxStack>
          <ProjectPartyDataGrid
            rows={parties}
            onEdit={openEditPartyDialog}
            onDelete={(partyId) => setDeletePartyId(partyId)}
            canManage={canManage}
          />
        </VxPaper>
      ) : null}
      </ProjectTabPanel>

      <ProjectTabPanel tab="assignments" activeTab={activeTab}>
      {activeTab === 'assignments' || visitedTabs.has('assignments') ? (
        <AssignmentsPanel projectId={projectId} />
      ) : null}
      </ProjectTabPanel>

      <ProjectTabPanel tab="documents" activeTab={activeTab}>
      {activeTab === 'documents' || visitedTabs.has('documents') ? (
        <VxStack spacing={2}>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <VxTypography component="h2" variant="h6">{t('pages.projectDocuments.projectTitle')}</VxTypography>
            {user?.permissions.includes('project-documents.view') ? (
              <VxButton variant="outlined" component={RouterLink} to={`/project-documents?${new URLSearchParams({ projectId })}`} state={{ returnTo: `${location.pathname}${location.search}`, returnState: location.state }}>{t('pages.projectDocuments.title', { defaultValue: 'Document Center' })}</VxButton>
            ) : null}
          </VxStack>
          <DocumentsPanel projectId={projectId} />
        </VxStack>
      ) : null}
      </ProjectTabPanel>

      <ProjectTabPanel tab="history" activeTab={activeTab}>
      {activeTab === 'history' || visitedTabs.has('history') ? (
        <VxPaper elevation={0} className="panel-card" sx={{ p: 0 }}>
          <VxStack sx={{ px: 2.5, pt: 2.5 }}>
            <VxTypography component="h2" variant="h6">{t('pages.projectDetails.history.title')}</VxTypography>
          </VxStack>
          <ProjectHistoryDataGrid rows={timeline} />
        </VxPaper>
      ) : null}
      </ProjectTabPanel>

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
            <VxAutocomplete
              options={availablePartyOptions}
              value={selectedPartyOption ?? null}
              loading={partyOptionsLoading}
              noOptionsText={t('pages.projectDetails.parties.noEligiblePartners')}
              disabled={isSavingParty || partyOptionsLoading || Boolean(partyOptionsError)}
              getOptionKey={(option) => `${option.relatedTenantId}:${option.relationshipType}`}
              getOptionLabel={(option) => `${option.relatedTenantCode} - ${option.relatedTenantName} - ${t(getRelationshipTypeLabelKey(option.relationshipType))}`}
              isOptionEqualToValue={(option, value) => option.relatedTenantId === value.relatedTenantId && option.relationshipType === value.relationshipType}
              onChange={(_, option) => setPartyFormState((previous) => ({
                ...previous, relatedTenantId: option?.relatedTenantId ?? '', relationshipType: option?.relationshipType ?? 2,
                canViewDocuments: option?.canViewDocuments ?? false, canUploadDocuments: false, canAssignPeople: false,
                effectiveFrom: option?.effectiveFrom ?? '', effectiveTo: option?.effectiveTo ?? '',
              }))}
              renderInput={(params) => <VxTextField {...params} size="small" label={t('pages.projectDetails.parties.fields.partnerRelationship')} helperText={editingParty && !selectedPartyOption ? t('pages.projectDetails.parties.unavailableRelationship') : undefined} />}
            />
            {partyScopeInvalid ? <VxAlert severity="error">{t('pages.projectDetails.parties.scopeUnavailable')}</VxAlert> : null}
            {(['canViewDocuments', 'canUploadDocuments', 'canAssignPeople'] as const).map((permission) => (
              <VxFormControlLabel key={permission} label={t(`pages.projectDetails.parties.fields.${permission}`)} control={<VxCheckbox checked={partyFormState[permission]} disabled={isSavingParty || !selectedPartyOption || (!selectedPartyOption[permission] && !partyFormState[permission])} onChange={(_, checked) => setPartyFormState((previous) => ({ ...previous, [permission]: checked }))} />} />
            ))}
            <VxFormControlLabel label={t('pages.projectDetails.parties.fields.isActive')} control={<VxCheckbox checked={partyFormState.isActive} disabled={isSavingParty} onChange={(_, checked) => setPartyFormState((previous) => ({ ...previous, isActive: checked }))} />} />

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                label={t('pages.projectDetails.parties.fields.effectiveFrom')}
                type="date"
                value={partyFormState.effectiveFrom}
                error={partyPeriodInvalid}
                helperText={partyPeriodInvalid ? t('pages.projectDetails.parties.periodInvalid') : undefined}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: selectedPartyOption?.effectiveFrom ?? undefined, max: selectedPartyOption?.effectiveTo ?? undefined } }}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, effectiveFrom: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                label={t('pages.projectDetails.parties.fields.effectiveTo')}
                type="date"
                value={partyFormState.effectiveTo}
                error={partyPeriodInvalid}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: partyFormState.effectiveFrom || selectedPartyOption?.effectiveFrom || undefined, max: selectedPartyOption?.effectiveTo ?? undefined } }}
                onChange={(event) => setPartyFormState((previous) => ({ ...previous, effectiveTo: event.target.value }))}
                fullWidth
              />
            </VxStack>
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestPartyEditorClose}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handlePartySave()} disabled={isSavingParty || !selectedPartyOption || partyPeriodInvalid || Boolean(partyScopeInvalid) || partyOptionsLoading || Boolean(partyOptionsError)}>
            {editingParty ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {partyDiscardDialog}

      <VxConfirmActionDialog open={canManage && Boolean(deletePartyId)} title={t('pages.projectDetails.parties.dialogs.delete.title')} targetName={parties.find((party) => party.id === deletePartyId)?.relatedTenantName ?? t('pages.tenantRelationships.unavailableTenant')} consequence={t('pages.projectDetails.parties.dialogs.delete.message')} confirmLabel={t('common.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeletingParty} onClose={() => setDeletePartyId(null)} onConfirm={() => void handlePartyDelete()} />
    </VxStack>
  )
}
