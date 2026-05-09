import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import { DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { WarehouseGridRow } from '../../../types/ui'

type WarehouseDataGridProps = {
  rows: WarehouseGridRow[]
  isLoading: boolean
  highlightedWarehouseId?: string | null
  onEdit: (warehouseId: string) => void
  onDelete: (row: WarehouseGridRow) => void
}

export default function WarehouseDataGrid({ rows, isLoading, highlightedWarehouseId, onEdit, onDelete }: WarehouseDataGridProps) {
  const { t } = useTranslation()
  const columns: GridColDef<WarehouseGridRow>[] = [
    {
      field: 'name',
      headerName: t('components.warehouses.grid.columns.warehouse'),
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">{t('components.warehouses.grid.codePrefix')} {row.code}</Typography>
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: t('components.warehouses.grid.columns.status'),
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => <Chip size="small" color={value ? 'primary' : 'default'} label={value ? t('components.warehouses.grid.active') : t('components.warehouses.grid.inactive')} variant={value ? 'filled' : 'outlined'} />,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('components.warehouses.grid.columns.actions'),
      minWidth: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row.id)} showInMenu={false} />,
        <GridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('dialogs.delete')} onClick={() => onDelete(row)} showInMenu={false} />,
      ],
    },
  ]

  return (
    <DataGrid
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
        '& .warehouse-row-focused': {
          backgroundColor: 'rgba(108, 92, 231, 0.08)',
        },
      }}
      getRowClassName={({ row }) => (row.id === highlightedWarehouseId ? 'warehouse-row-focused' : '')}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}