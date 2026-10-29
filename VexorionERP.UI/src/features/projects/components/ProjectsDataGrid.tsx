import {
  DeleteOutlineRoundedIcon,
  EditRoundedIcon,
  VxBox,
  VxChip,
  VxDataGrid,
  VxGridActionsCellItem,
  type VxGridColDef,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProjectLifecycleStatus } from '../../../types/api'
import type { ProjectGridRow } from '../../../types/ui'
import { getProjectStatusLabelKey } from '../projectPresentation'

type ProjectsDataGridProps = {
  rows: ProjectGridRow[]
  isLoading: boolean
  onOpenDetails: (projectId: string) => void
  onEdit: (project: ProjectGridRow) => void
  onDelete: (project: ProjectGridRow) => void
  canManage?: boolean
}

export default function ProjectsDataGrid({ rows, isLoading, onOpenDetails, onEdit, onDelete, canManage = true }: ProjectsDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<ProjectGridRow>[] = [
    {
      field: 'project', headerName: t('pages.projects.columns.project'), minWidth: 220, flex: 1.2, sortable: false,
      valueGetter: (_value, row) => row.name,
      renderCell: ({ row }) => <VxBox sx={{ py: 1 }}><VxTypography sx={{ fontWeight: 700 }}>{row.name}</VxTypography><VxTypography variant="body2" color="text.secondary">{row.projectNumber}</VxTypography></VxBox>,
    },
    { field: 'categoryLabel', headerName: t('pages.projects.columns.category'), minWidth: 210, flex: 1, renderCell: ({ row }) => row.categoryLabel || row.projectCategoryId },
    { field: 'duration', headerName: t('pages.projects.columns.duration'), minWidth: 220, flex: 1, sortable: false, valueGetter: (_value, row) => `${row.startDate} - ${row.endDate || t('common.labels.open')}` },
    {
      field: 'status', headerName: t('pages.projects.columns.status'), minWidth: 140, flex: 0.8,
      renderCell: ({ value }) => <VxChip size="small" label={t(getProjectStatusLabelKey(value as ProjectLifecycleStatus))} color={value === 6 ? 'default' : 'primary'} variant={value === 6 ? 'outlined' : 'filled'} />,
    },
    { field: 'isActive', headerName: t('pages.projects.columns.active'), minWidth: 130, flex: 0.7, renderCell: ({ value }) => (value ? t('common.labels.active') : t('common.labels.inactive')) },
    {
      field: 'actions', type: 'actions', headerName: t('pages.projects.columns.actions'), minWidth: 120,
      getActions: ({ row }) => [
        <VxGridActionsCellItem key={`details-${row.id}`} icon={<EditRoundedIcon />} label={t('common.labels.details')} onClick={() => onOpenDetails(row.id)} showInMenu />,
        ...(canManage ? [
          <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row)} showInMenu={false} />,
          <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('common.delete')} onClick={() => onDelete(row)} showInMenu={false} />,
        ] : []),
      ],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="projects" autoHeight rows={rows} columns={columns} loading={isLoading}
      disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'name', sort: 'asc' }] } }}
      showToolbar localeText={{ noRowsLabel: t('pages.projects.noRecords') }}
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}
