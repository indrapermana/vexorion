import { Box, Chip, Typography } from '@mui/material'
import { DeleteOutlineRoundedIcon, EditRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SupplierGridRow } from '../../../types/ui'

type SupplierDataGridProps = {
  rows: SupplierGridRow[]
  isLoading: boolean
  onEdit: (supplierId: string) => void
  onDelete: (row: SupplierGridRow) => void
}

export default function SupplierDataGrid({ rows, isLoading, onEdit, onDelete }: SupplierDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<SupplierGridRow>[] = [
    {
      field: 'name',
      headerName: t('components.suppliers.grid.columns.supplier'),
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">{t('components.suppliers.grid.numberPrefix')} {row.supplierNumber}</Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: t('components.suppliers.grid.columns.email'),
      minWidth: 220,
      flex: 1,
      renderCell: ({ value }) => <Typography variant="body2" color="text.secondary">{value || t('components.suppliers.grid.noEmail')}</Typography>,
    },
    {
      field: 'isActive',
      headerName: t('components.suppliers.grid.columns.status'),
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => (
        <Chip size="small" color={value ? 'primary' : 'default'} label={value ? t('components.suppliers.grid.active') : t('components.suppliers.grid.inactive')} variant={value ? 'filled' : 'outlined'} />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('components.suppliers.grid.columns.actions'),
      minWidth: 110,
      getActions: ({ row }) => [
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row.id)} showInMenu={false} />,
        <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('dialogs.delete')} onClick={() => onDelete(row)} showInMenu={false} />,
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'name', sort: 'asc' }] } }}
      showToolbar
      sx={{
        border: 'none',
        '--DataGrid-containerBackground': 'transparent',
        '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' },
        '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' },
      }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}