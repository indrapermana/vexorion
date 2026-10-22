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
  const { t } = useTranslation()
  const columns: VxGridColDef<AccountGridRow>[] = [
    { field: 'code', headerName: t('pages.accounts.fields.code'), minWidth: 120, flex: 0.5 },
    {
      field: 'name',
      headerName: t('pages.accounts.fields.name'),
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
      headerName: t('pages.accounts.grid.posting'),
      minWidth: 120,
      flex: 0.4,
      renderCell: ({ row }) => (
        <VxChip size="small" color={row.isPostingAllowed ? 'success' : 'default'} label={row.isPostingAllowed ? t('pages.accounts.grid.allowed') : t('pages.accounts.grid.blocked')} />
      ),
    },
    {
      field: 'isActive',
      headerName: t('common.labels.status'),
      minWidth: 110,
      flex: 0.4,
      renderCell: ({ row }) => (
        <VxChip size="small" color={row.isActive ? 'primary' : 'default'} label={row.isActive ? t('common.labels.active') : t('common.labels.inactive')} />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('common.actions'),
      minWidth: 120,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row.id)} showInMenu={false} />,
        <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('common.delete')} onClick={() => onDelete(row)} showInMenu={false} />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="accounts"
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
