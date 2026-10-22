import { DeleteOutlineRoundedIcon, EditRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxBox, VxChip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { getAccountTypeLabel, getNormalBalanceLabel, type AccountGridRow } from '../../../types/ui'

type AccountDataGridProps = {
  rows: AccountGridRow[]
  isLoading: boolean
  onEdit: (accountId: string) => void
  onDelete: (row: AccountGridRow) => void
  canManage?: boolean
}

export default function AccountDataGrid({ rows, isLoading, onEdit, onDelete, canManage = true }: AccountDataGridProps) {
  useTranslation()
  const columns: VxGridColDef<AccountGridRow>[] = [
    { field: 'code', headerName: 'Code', minWidth: 120, flex: 0.5 },
    {
      field: 'name',
      headerName: 'Name',
      minWidth: 200,
      flex: 1,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.name}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">
            {getAccountTypeLabel(row.accountType)} / {getNormalBalanceLabel(row.normalBalance)}
          </VxTypography>
        </VxBox>
      ),
    },
    {
      field: 'isPostingAllowed',
      headerName: 'Posting',
      minWidth: 120,
      flex: 0.4,
      renderCell: ({ row }) => (
        <VxChip size="small" color={row.isPostingAllowed ? 'success' : 'default'} label={row.isPostingAllowed ? 'Allowed' : 'Blocked'} />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      minWidth: 110,
      flex: 0.4,
      renderCell: ({ row }) => (
        <VxChip size="small" color={row.isActive ? 'primary' : 'default'} label={row.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 120,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label="Edit" onClick={() => onEdit(row.id)} showInMenu={false} />,
        <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label="Delete" onClick={() => onDelete(row)} showInMenu={false} />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      autoHeight
      rows={rows}
      columns={columns}
      loading={isLoading}
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
      showToolbar
      slotProps={{ toolbar: { showQuickFilter: true } }}
      sx={{ border: 'none' }}
    />
  )
}
