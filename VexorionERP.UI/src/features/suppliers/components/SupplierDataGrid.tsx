import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import type { SupplierGridRow } from '../../../types/ui'

type SupplierDataGridProps = {
  rows: SupplierGridRow[]
  isLoading: boolean
  onEdit: (supplierId: string) => void
  onDelete: (row: SupplierGridRow) => void
}

export default function SupplierDataGrid({ rows, isLoading, onEdit, onDelete }: SupplierDataGridProps) {
  const columns: GridColDef<SupplierGridRow>[] = [
    {
      field: 'name',
      headerName: 'Supplier',
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">No. {row.supplierNumber}</Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      minWidth: 220,
      flex: 1,
      renderCell: ({ value }) => <Typography variant="body2" color="text.secondary">{value || 'No email'}</Typography>,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => (
        <Chip size="small" color={value ? 'primary' : 'default'} label={value ? 'Active' : 'Inactive'} variant={value ? 'filled' : 'outlined'} />
      ),
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
      }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}