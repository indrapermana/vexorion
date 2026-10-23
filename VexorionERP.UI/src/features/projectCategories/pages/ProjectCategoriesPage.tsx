import { useCallback, useEffect, useState } from 'react'
import { AddIcon } from '@vexorion/ui'
import {
  DeleteOutlineRoundedIcon,
  EditRoundedIcon,
  VxAlert,
  VxButton,
  VxConfirmActionDialog,
  VxDataGrid,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxGridActionsCellItem,
  type VxGridColDef,
  VxStack,
  VxSwitch,
  VxTextField,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import {
  ApiError,
  createProjectCategory,
  deleteProjectCategory,
  getProjectCategories,
  updateProjectCategory,
} from '../../../lib/api'
import type { ProjectCategoryListItemResponse } from '../../../types/api'

type CategoryDataGridProps = {
  rows: ProjectCategoryListItemResponse[]
  onEdit: (category: ProjectCategoryListItemResponse) => void
  onDelete: (category: ProjectCategoryListItemResponse) => void
  canManage?: boolean
}

function CategoryDataGrid({ rows, onEdit, onDelete, canManage = true }: CategoryDataGridProps) {
  const { t } = useTranslation()

  const columns: VxGridColDef<ProjectCategoryListItemResponse>[] = [
    {
      field: 'code',
      headerName: t('pages.projectCategories.columns.code'),
      minWidth: 150,
      flex: 0.8,
      renderCell: ({ value }) => (
        <VxTypography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{value}</VxTypography>
      ),
    },
    {
      field: 'name',
      headerName: t('pages.projectCategories.columns.name'),
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'description',
      headerName: t('pages.projectCategories.columns.description'),
      minWidth: 220,
      flex: 1.3,
      renderCell: ({ value }) => value || t('common.labels.none'),
    },
    {
      field: 'isActive',
      headerName: t('pages.projectCategories.columns.active'),
      minWidth: 130,
      flex: 0.7,
      renderCell: ({ value }) => (value ? t('common.labels.active') : t('common.labels.inactive')),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('pages.projectCategories.columns.actions'),
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
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="project-categories"
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
          sortModel: [{ field: 'code', sort: 'asc' }],
        },
      }}
      showToolbar
      localeText={{
        noRowsLabel: t('pages.projectCategories.noRecords'),
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

export default function ProjectCategoriesPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.projects.manage) ?? false
  const [categories, setCategories] = useState<ProjectCategoryListItemResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createCode, setCreateCode] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const [editTarget, setEditTarget] = useState<ProjectCategoryListItemResponse | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editLoading, setEditLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ProjectCategoryListItemResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    if (!isAuthenticated) {
      setCategories([])
      return
    }

    setError(null)
    try {
      setCategories(await getProjectCategories())
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectCategories.errors.load'))
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const handleCreate = async () => {
    if (!canManage) return
    if (!createCode.trim() || !createName.trim()) {
      return
    }

    setCreateLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await createProjectCategory({
        code: createCode.trim(),
        name: createName.trim(),
        description: createDescription.trim() || null,
      })
      setCreateOpen(false)
      setCreateCode('')
      setCreateName('')
      setCreateDescription('')
      setFeedback(t('pages.projectCategories.feedback.created'))
      await loadCategories()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.projectCategories.errors.save'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!canManage) return
    if (!editTarget || !editCode.trim() || !editName.trim()) {
      return
    }

    setEditLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await updateProjectCategory(editTarget.id, {
        code: editCode.trim(),
        name: editName.trim(),
        description: editDescription.trim() || null,
        isActive: editIsActive,
      })
      setEditTarget(null)
      setFeedback(t('pages.projectCategories.feedback.updated'))
      await loadCategories()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.projectCategories.errors.save'))
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!canManage) return
    if (!deleteTarget) {
      return
    }

    setDeleteLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await deleteProjectCategory(deleteTarget.id)
      setDeleteTarget(null)
      setFeedback(t('pages.projectCategories.feedback.deleted'))
      await loadCategories()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.projectCategories.errors.delete'))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.projectCategories.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('pages.projectCategories.title')}
        description={t('pages.projectCategories.description')}
        primaryAction={canManage ? <VxButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateCode('')
              setCreateName('')
              setCreateDescription('')
              setCreateOpen(true)
            }}
          >
            {t('pages.projectCategories.addButton')}
          </VxButton> : null}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadCategories() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.projects.manage} /> : null}

      <PageBody>
        <CategoryDataGrid
          rows={categories}
          onEdit={(category) => {
            setEditTarget(category)
            setEditCode(category.code)
            setEditName(category.name)
            setEditDescription(category.description || '')
            setEditIsActive(category.isActive)
          }}
          onDelete={(category) => setDeleteTarget(category)}
          canManage={canManage}
        />
      </PageBody>

      <VxDialog open={canManage && createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectCategories.dialogs.create')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField
              autoFocus
              size="small"
              label={t('pages.projectCategories.fields.code')}
              value={createCode}
              onChange={(event) => setCreateCode(event.target.value)}
              fullWidth
            />
            <VxTextField
              size="small"
              label={t('pages.projectCategories.fields.name')}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              fullWidth
            />
            <VxTextField
              size="small"
              label={t('pages.projectCategories.fields.description')}
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setCreateOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleCreate()} disabled={!createCode.trim() || !createName.trim() || createLoading}>
            {t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxDialog open={canManage && Boolean(editTarget)} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <VxDialogTitle>{t('pages.projectCategories.dialogs.edit')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField
              autoFocus
              size="small"
              label={t('pages.projectCategories.fields.code')}
              value={editCode}
              onChange={(event) => setEditCode(event.target.value)}
              fullWidth
            />
            <VxTextField
              size="small"
              label={t('pages.projectCategories.fields.name')}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              fullWidth
            />
            <VxTextField
              size="small"
              label={t('pages.projectCategories.fields.description')}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <VxSwitch
              checked={editIsActive}
              slotProps={{ input: { 'aria-label': `${t('pages.projectCategories.fields.isActive')}: ${editName || editCode}` } }}
              onChange={(event) => setEditIsActive(event.target.checked)}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setEditTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleEdit()} disabled={!editCode.trim() || !editName.trim() || editLoading}>
            {t('common.save')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      <VxConfirmActionDialog open={canManage && Boolean(deleteTarget)} title={t('pages.projectCategories.dialogs.delete.title')} targetName={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''} consequence={t('pages.projectCategories.dialogs.delete.message', { name: deleteTarget?.name ?? '' })} confirmLabel={t('common.delete')} pendingLabel={t('dialogs.deleting')} pending={deleteLoading} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </VxStack>
  )
}
