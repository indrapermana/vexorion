import {
  DeleteOutlineRoundedIcon,
  EditRoundedIcon,
  VxChip,
  VxDataGrid,
  VxGridActionsCellItem,
  type VxGridColDef,
  VxStack,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProjectPartyListItemResponse, TenantRelationshipType } from '../../../types/api'
import { getRelationshipTypeLabelKey } from '../projectPresentation'

type ProjectPartyDataGridProps = {
  rows: ProjectPartyListItemResponse[]
  onEdit: (party: ProjectPartyListItemResponse) => void
  onDelete: (partyId: string) => void
  canManage?: boolean
}

export default function ProjectPartyDataGrid({ rows, onEdit, onDelete, canManage = true }: ProjectPartyDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<ProjectPartyListItemResponse>[] = [
    {
      field: 'relatedTenantName', headerName: t('pages.projectDetails.parties.columns.relatedTenant'), minWidth: 230, flex: 1,
      renderCell: ({ row }) => <VxTypography variant="body2">{[row.relatedTenantCode, row.relatedTenantName].filter(Boolean).join(' - ') || t('pages.tenantRelationships.unavailableTenant')}</VxTypography>,
    },
    { field: 'relationshipType', headerName: t('pages.projectDetails.parties.columns.relationship'), minWidth: 180, flex: 0.9, renderCell: ({ value }) => t(getRelationshipTypeLabelKey(value as TenantRelationshipType)) },
    {
      field: 'scope', headerName: t('pages.projectDetails.parties.columns.scope'), minWidth: 220, flex: 1, sortable: false, filterable: false,
      renderCell: ({ row }) => <VxStack direction="row" spacing={0.75} sx={{ py: 1 }}>{row.canViewDocuments ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.viewDocuments')} /> : null}{row.canUploadDocuments ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.uploadDocuments')} /> : null}{row.canAssignPeople ? <VxChip size="small" label={t('pages.projectDetails.parties.scopeLabels.assignPeople')} /> : null}</VxStack>,
    },
    { field: 'effective', headerName: t('pages.projectDetails.parties.columns.effective'), minWidth: 200, flex: 0.9, sortable: false, valueGetter: (_value, row) => `${row.effectiveFrom || t('common.labels.any')} - ${row.effectiveTo || t('common.labels.open')}` },
    { field: 'isActive', headerName: t('pages.projectDetails.parties.columns.active'), minWidth: 120, flex: 0.7, renderCell: ({ value }) => (value ? t('common.labels.active') : t('common.labels.inactive')) },
    {
      field: 'actions', type: 'actions', headerName: t('pages.projectDetails.parties.columns.actions'), minWidth: 110,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row)} showInMenu={false} />,
        <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('common.delete')} onClick={() => onDelete(row.id)} showInMenu={false} />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="project-parties" autoHeight rows={rows} columns={columns} disableRowSelectionOnClick
      pageSizeOptions={[5, 10, 25]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'relatedTenantName', sort: 'asc' }] } }}
      showToolbar localeText={{ noRowsLabel: t('pages.projectDetails.parties.noRecords') }}
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}
