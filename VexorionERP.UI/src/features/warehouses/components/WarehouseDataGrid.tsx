import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import type { WarehouseGridRow } from '../../../types/ui'

type WarehouseDataGridProps = {
  rows: WarehouseGridRow[]
  isLoading: boolean
  highlightedWarehouseId?: string | null
  onEdit: (warehouseId: string) => void
  onDelete: (row: WarehouseGridRow) => void
}

export default function WarehouseDataGrid({ rows, isLoading, highlightedWarehouseId, onEdit, onDelete }: WarehouseDataGridProps) {
  const columns: GridColDef<WarehouseGridRow>[] = [
    {
      field: 'name',
      headerName: 'Warehouse',
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">Code {row.code}</Typography>
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => <Chip size="small" color={value ? 'primary' : 'default'} label={value ? 'Active' : 'Inactive'} variant={value ? 'filled' : 'outlined'} />,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label="Edit" onClick={() => onEdit(row.id)} showInMenu={false} />,
        <GridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label="Delete" onClick={() => onDelete(row)} showInMenu={false} />,
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