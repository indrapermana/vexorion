import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AddRoundedIcon,
  DeleteOutlineRoundedIcon,
  EditRoundedIcon,
  VxAlert,
  VxBox,
  VxButton,
  VxChip,
  VxDataGrid,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxGridActionsCellItem,
  type VxGridColDef,
  VxMenuItem,
  VxStack,
  VxTextField,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageMetric } from '../../../components/PagePrimitives'
import {
  ApiError,
  createProject,
  deleteProject,
  getProject,
  getProjectCategories,
  getProjects,
  updateProject,
} from '../../../lib/api'
import type { ProjectCategoryListItemResponse, ProjectLifecycleStatus } from '../../../types/api'
import type { ProjectGridRow, ProjectStatusFilterValue } from '../../../types/ui'

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

type ProjectsDataGridProps = {
  rows: ProjectGridRow[]
  isLoading: boolean
  onOpenDetails: (projectId: string) => void
  onEdit: (project: ProjectGridRow) => void
  onDelete: (project: ProjectGridRow) => void
  canManage?: boolean
}

const defaultProjectFormState: ProjectFormState = {
  projectCategoryId: '',
  projectNumber: '',
  name: '',
  governmentAgency: '',
  submissionReference: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  status: 1,
  notes: '',
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

function ProjectsDataGrid({ rows, isLoading, onOpenDetails, onEdit, onDelete, canManage = true }: ProjectsDataGridProps) {
  const { t } = useTranslation()

  const columns: VxGridColDef<ProjectGridRow>[] = [
    {
      field: 'project',
      headerName: t('pages.projects.columns.project'),
      minWidth: 220,
      flex: 1.2,
      sortable: false,
      valueGetter: (_value, row) => row.name,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.name}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">{row.projectNumber}</VxTypography>
        </VxBox>
      ),
    },
    {
      field: 'categoryLabel',
      headerName: t('pages.projects.columns.category'),
      minWidth: 210,
      flex: 1,
      renderCell: ({ row }) => row.categoryLabel || row.projectCategoryId,
    },
    {
      field: 'duration',
      headerName: t('pages.projects.columns.duration'),
      minWidth: 220,
      flex: 1,
      sortable: false,
      valueGetter: (_value, row) => `${row.startDate} - ${row.endDate || t('common.labels.open')}`,
    },
    {
      field: 'status',
      headerName: t('pages.projects.columns.status'),
      minWidth: 140,
      flex: 0.8,
      renderCell: ({ value }) => (
        <VxChip
          size="small"
          label={t(getStatusLabelKey(value as ProjectLifecycleStatus))}
          color={value === 6 ? 'default' : 'primary'}
          variant={value === 6 ? 'outlined' : 'filled'}
        />
      ),
    },
    {
      field: 'isActive',
      headerName: t('pages.projects.columns.active'),
      minWidth: 130,
      flex: 0.7,
      renderCell: ({ value }) => (value ? t('common.labels.active') : t('common.labels.inactive')),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('pages.projects.columns.actions'),
      minWidth: 120,
      getActions: ({ row }) => [
        <VxGridActionsCellItem
          key={`details-${row.id}`}
          icon={<EditRoundedIcon />}
          label={t('common.labels.details')}
          onClick={() => onOpenDetails(row.id)}
          showInMenu
        />,
        ...(canManage ? [<VxGridActionsCellItem
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
          onClick={() => onDelete(row)}
          showInMenu={false}
        />] : []),
      ],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="projects"
      autoHeight
      rows={rows}
      columns={columns}
      loading={isLoading}
      disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{
        pagination: {
          paginationModel: { pageSize: 10, page: 0 },
        },
        sorting: {
          sortModel: [{ field: 'name', sort: 'asc' }],
        },
      }}
      showToolbar
      localeText={{
        noRowsLabel: t('pages.projects.noRecords'),
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

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.projects.manage) ?? false
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ProjectCategoryListItemResponse[]>([])
  const [projects, setProjects] = useState<ProjectGridRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilterValue>('all')
  const [relatedTenantIdFilter, setRelatedTenantIdFilter] = useState('')

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectGridRow | null>(null)
  const [formState, setFormState] = useState<ProjectFormState>(defaultProjectFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingEditor, setIsLoadingEditor] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ProjectGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const categoryLabelById = useMemo(() => new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])), [categories])

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [categoryResult, projectResult] = await Promise.all([
        getProjectCategories(),
        getProjects({
          status: statusFilter === 'all' ? undefined : statusFilter,
          relatedTenantId: relatedTenantIdFilter.trim() || undefined,
        }),
      ])

      const categoryMap = new Map(categoryResult.map((item) => [item.id, `${item.code} - ${item.name}`]))

      setCategories(categoryResult)
      setProjects(projectResult.map((item) => ({
        ...item,
        categoryLabel: categoryMap.get(item.projectCategoryId),
      })))
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projects.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, relatedTenantIdFilter, statusFilter, t])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const openCreateDialog = () => {
    if (!canManage) return
    setFeedback(null)
    setEditingProject(null)
    setFormState({
      ...defaultProjectFormState,
      projectCategoryId: categories[0]?.id ?? '',
    })
    setIsEditorOpen(true)
  }

  const openEditDialog = async (project: ProjectGridRow) => {
    if (!canManage) return
    setFeedback(null)
    setEditingProject(project)
    setError(null)
    setIsLoadingEditor(true)
    setIsEditorOpen(true)

    try {
      const details = await getProject(project.id)
      setFormState({
        projectCategoryId: details.projectCategoryId,
        projectNumber: details.projectNumber,
        name: details.name,
        governmentAgency: details.governmentAgency ?? '',
        submissionReference: details.submissionReference ?? '',
        startDate: details.startDate,
        endDate: details.endDate ?? '',
        status: details.status,
        notes: details.notes ?? '',
        isActive: details.isActive,
      })
    } catch (loadError) {
      setIsEditorOpen(false)
      setEditingProject(null)
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projects.errors.loadDetails'))
    } finally {
      setIsLoadingEditor(false)
    }
  }

  const hasInvalidPeriod = Boolean(
    formState.startDate
    && formState.endDate
    && formState.endDate < formState.startDate,
  )

  const handleSave = async () => {
    if (!canManage) return
    if (!formState.projectCategoryId || !formState.projectNumber.trim() || !formState.name.trim() || hasInvalidPeriod) {
      return
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      const requestPayload = {
        projectCategoryId: formState.projectCategoryId,
        projectNumber: formState.projectNumber.trim(),
        name: formState.name.trim(),
        governmentAgency: formState.governmentAgency.trim() || null,
        submissionReference: formState.submissionReference.trim() || null,
        startDate: formState.startDate,
        endDate: formState.endDate || null,
        status: formState.status,
        notes: formState.notes.trim() || null,
      }

      if (editingProject) {
        await updateProject(editingProject.id, {
          ...requestPayload,
          isActive: formState.isActive,
        })
        setFeedback(t('pages.projects.feedback.updated'))
      } else {
        await createProject(requestPayload)
        setFeedback(t('pages.projects.feedback.created'))
      }

      setIsEditorOpen(false)
      await loadProjects()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.projects.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canManage || !deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      setFeedback(t('pages.projects.feedback.deleted'))
      await loadProjects()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projects.errors.delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  const statusOptions: Array<{ value: ProjectLifecycleStatus, label: string }> = [
    { value: 1, label: t('common.statusLabels.draft') },
    { value: 2, label: t('common.statusLabels.inReview') },
    { value: 3, label: t('common.statusLabels.submitted') },
    { value: 4, label: t('common.statusLabels.awarded') },
    { value: 5, label: t('common.statusLabels.completed') },
    { value: 6, label: t('common.statusLabels.cancelled') },
  ]

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.projects.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('pages.projects.title')}
        description={t('pages.projects.description')}
        primaryAction={canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              {t('pages.projects.addButton')}
            </VxButton> : null}
        metrics={<PageMetric label={t('pages.projects.countMetric')} value={projects.length} />}
        filters={(
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <VxTextField
            select
            size="small"
            label={t('pages.projects.filters.status')}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value === 'all' ? 'all' : Number(event.target.value) as ProjectLifecycleStatus)}
            sx={{ minWidth: 200 }}
          >
            <VxMenuItem value="all">{t('pages.projects.filters.allStatuses')}</VxMenuItem>
            {statusOptions.map((option) => (
              <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
            ))}
          </VxTextField>

          <VxTextField
            size="small"
            label={t('pages.projects.filters.relatedTenantId')}
            value={relatedTenantIdFilter}
            onChange={(event) => setRelatedTenantIdFilter(event.target.value)}
            placeholder={t('pages.projects.filters.tenantIdPlaceholder')}
            fullWidth
          />

          <VxButton variant="outlined" onClick={() => void loadProjects()}>
            {t('pages.projects.filters.apply')}
          </VxButton>
          <VxButton
            variant="text"
            disabled={statusFilter === 'all' && !relatedTenantIdFilter}
            onClick={() => {
              setStatusFilter('all')
              setRelatedTenantIdFilter('')
            }}
          >
            {t('common.resetFilters', { defaultValue: 'Reset filters' })}
          </VxButton>
        </VxStack>
        )}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadProjects() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.projects.manage} /> : null}

      <PageBody>
        <ProjectsDataGrid
          rows={projects}
          isLoading={isLoading}
          onOpenDetails={(projectId) => navigate(`/projects/${projectId}`)}
          onEdit={openEditDialog}
          onDelete={(project) => setDeleteTarget(project)}
          canManage={canManage}
        />
      </PageBody>

      <VxDialog open={canManage && isEditorOpen} onClose={() => setIsEditorOpen(false)} maxWidth="md" fullWidth>
        <VxDialogTitle>{editingProject ? t('pages.projects.dialogs.edit') : t('pages.projects.dialogs.create')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            {hasInvalidPeriod ? (
              <VxAlert severity="error">{t('pages.projects.errors.invalidPeriod')}</VxAlert>
            ) : null}
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                select
                size="small"
                label={t('pages.projects.fields.category')}
                value={formState.projectCategoryId}
                onChange={(event) => setFormState((previous) => ({ ...previous, projectCategoryId: event.target.value }))}
                fullWidth
              >
                {categories.map((category) => (
                  <VxMenuItem key={category.id} value={category.id}>
                    {categoryLabelById.get(category.id)}
                  </VxMenuItem>
                ))}
              </VxTextField>
              <VxTextField
                size="small"
                label={t('pages.projects.fields.projectNumber')}
                value={formState.projectNumber}
                onChange={(event) => setFormState((previous) => ({ ...previous, projectNumber: event.target.value }))}
                fullWidth
              />
            </VxStack>

            <VxTextField
              size="small"
              label={t('pages.projects.fields.projectName')}
              value={formState.name}
              onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
              fullWidth
            />

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                label={t('pages.projects.fields.governmentAgency')}
                value={formState.governmentAgency}
                onChange={(event) => setFormState((previous) => ({ ...previous, governmentAgency: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                label={t('pages.projects.fields.submissionReference')}
                value={formState.submissionReference}
                onChange={(event) => setFormState((previous) => ({ ...previous, submissionReference: event.target.value }))}
                fullWidth
              />
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                label={t('pages.projects.fields.startDate')}
                type="date"
                value={formState.startDate}
                onChange={(event) => setFormState((previous) => ({ ...previous, startDate: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                label={t('pages.projects.fields.endDate')}
                type="date"
                value={formState.endDate}
                onChange={(event) => setFormState((previous) => ({ ...previous, endDate: event.target.value }))}
                fullWidth
              />
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                select
                size="small"
                label={t('pages.projects.fields.status')}
                value={formState.status}
                onChange={(event) => setFormState((previous) => ({ ...previous, status: Number(event.target.value) as ProjectLifecycleStatus }))}
                fullWidth
              >
                {statusOptions.map((option) => (
                  <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
                ))}
              </VxTextField>
              <VxTextField
                select
                size="small"
                label={t('pages.projects.fields.isActive')}
                value={formState.isActive ? 'true' : 'false'}
                onChange={(event) => setFormState((previous) => ({ ...previous, isActive: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            </VxStack>

            <VxTextField
              size="small"
              label={t('pages.projects.fields.notes')}
              value={formState.notes}
              onChange={(event) => setFormState((previous) => ({ ...previous, notes: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setIsEditorOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleSave()} disabled={isSaving || isLoadingEditor || hasInvalidPeriod || !formState.projectCategoryId || !formState.projectNumber.trim() || !formState.name.trim()}>
            {editingProject ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('pages.projects.dialogs.delete.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxTypography>
            {t('pages.projects.dialogs.delete.message', { name: deleteTarget?.name ?? '' })}
          </VxTypography>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" color="error" onClick={() => void handleDelete()} disabled={isDeleting}>{t('common.delete')}</VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
