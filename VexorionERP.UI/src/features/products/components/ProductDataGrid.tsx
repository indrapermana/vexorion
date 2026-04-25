import {
  Box,
  Chip,
  Typography,
} from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import type { ProductGridRow } from '../../../types/ui'

type ProductDataGridProps = {
  rows: ProductGridRow[]
  isLoading: boolean
  onEdit: (productId: string) => void
  onDelete: (row: ProductGridRow) => void
}

export default function ProductDataGrid({ rows, isLoading, onEdit, onDelete }: ProductDataGridProps) {
  const columns: GridColDef<ProductGridRow>[] = [
    {
      field: 'name',
      headerName: 'Product',
      flex: 1.3,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">SKU {row.sku}</Typography>
        </Box>
      ),
    },
    {
      field: 'unitOfMeasure',
      headerName: 'UOM',
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: 'salesPrice',
      headerName: 'Sales price',
      minWidth: 150,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      minWidth: 140,
      flex: 0.7,
      sortable: false,
      renderCell: ({ value }) => (
        <Chip
          size="small"
          color={value ? 'primary' : 'default'}
          label={value ? 'Active' : 'Inactive'}
          variant={value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key={`edit-${row.id}`}
          icon={<EditRoundedIcon />}
          label="Edit"
          onClick={() => onEdit(row.id)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label="Delete"
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
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