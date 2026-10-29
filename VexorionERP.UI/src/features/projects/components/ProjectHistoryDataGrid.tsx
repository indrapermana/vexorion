import { VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProjectTimelineItemResponse } from '../../../types/api'

type ProjectHistoryDataGridProps = {
  rows: ProjectTimelineItemResponse[]
}

export default function ProjectHistoryDataGrid({ rows }: ProjectHistoryDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<ProjectTimelineItemResponse>[] = [
    { field: 'createdAtUtc', headerName: t('pages.projectDetails.history.columns.timestamp'), minWidth: 220, flex: 1, renderCell: ({ value }) => new Date(value as string).toLocaleString() },
    { field: 'eventType', headerName: t('pages.projectDetails.history.columns.event'), minWidth: 180, flex: 0.9 },
    { field: 'description', headerName: t('pages.projectDetails.history.columns.description'), minWidth: 260, flex: 1.4, renderCell: ({ value }) => value || t('common.labels.none') },
    { field: 'actorUserId', headerName: t('pages.projectDetails.history.columns.actor'), minWidth: 220, flex: 1, renderCell: ({ value }) => value || t('common.labels.none') },
  ]

  return (
    <VxDataGrid
      preferenceKey="project-history" autoHeight rows={rows} columns={columns} disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'createdAtUtc', sort: 'desc' }] } }}
      showToolbar localeText={{ noRowsLabel: t('pages.projectDetails.history.noRecords') }}
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}
