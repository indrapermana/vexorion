import { VxBox, VxChip, VxTypography } from '@vexorion/ui'
import { DeleteOutlineRoundedIcon, EditRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { CustomerGridRow } from '../../../types/ui'

type CustomerDataGridProps = {
  rows: CustomerGridRow[]
  isLoading: boolean
  onEdit: (customerId: string) => void
  onDelete: (row: CustomerGridRow) => void
}

export default function CustomerDataGrid({ rows, isLoading, onEdit, onDelete }: CustomerDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<CustomerGridRow>[] = [
    {
      field: 'name',
      headerName: t('components.customers.grid.columns.customer'),
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.name}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">{t('components.customers.grid.numberPrefix')} {row.customerNumber}</VxTypography>
        </VxBox>
      ),
    },
    {
      field: 'email',
      headerName: t('components.customers.grid.columns.email'),
      minWidth: 220,
      flex: 1,
      renderCell: ({ value }) => (
        <VxTypography variant="body2" color="text.secondary">{value || t('components.customers.grid.noEmail')}</VxTypography>
      ),
    },
    {
      field: 'isActive',
      headerName: t('components.customers.grid.columns.status'),
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => (
        <VxChip
          size="small"
          color={value ? 'primary' : 'default'}
          label={value ? t('components.customers.grid.active') : t('components.customers.grid.inactive')}
          variant={value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('components.customers.grid.columns.actions'),
      minWidth: 110,
      getActions: ({ row }) => [
        <VxGridActionsCellItem
          key={`edit-${row.id}`}
          icon={<EditRoundedIcon />}
          label={t('common.edit')}
          onClick={() => onEdit(row.id)}
          showInMenu={false}
        />,
        <VxGridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label={t('dialogs.delete')}
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
      ],
    },
  ]

  return (
    <VxDataGrid
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