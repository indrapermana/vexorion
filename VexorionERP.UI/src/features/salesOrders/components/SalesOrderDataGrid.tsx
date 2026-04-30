import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded'
import { getDocumentStatusLabel, type SalesOrderGridRow } from '../../../types/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'

type SalesOrderDataGridProps = {
  rows: SalesOrderGridRow[]
  isLoading: boolean
  onEdit: (salesOrderId: string) => void
  onDelete: (row: SalesOrderGridRow) => void
  onManageLines: (row: SalesOrderGridRow) => void
  onCreateInvoice: (row: SalesOrderGridRow) => void
  onViewShipments: (row: SalesOrderGridRow) => void
}

function getStatusColor(status: number) {
  if (status === 2) {
    return 'primary' as const
  }
  if (status === 4) {
    return 'success' as const
  }
  if (status === 5) {
    return 'error' as const
  }
  return 'default' as const
}

export default function SalesOrderDataGrid({ rows, isLoading, onEdit, onDelete, onManageLines, onCreateInvoice, onViewShipments }: SalesOrderDataGridProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const columns: GridColDef<SalesOrderGridRow>[] = [
    {
      field: 'orderNumber',
      headerName: 'Order',
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.orderNumber}</Typography>
          <Typography variant="body2" color="text.secondary">{row.customerName ?? row.customerId}</Typography>
        </Box>
      ),
    },
    {
      field: 'orderDate',
      headerName: 'Order date',
      minWidth: 130,
      flex: 0.7,
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 160,
      flex: 0.8,
      renderCell: ({ value }) => <Chip size="small" color={getStatusColor(Number(value))} label={getDocumentStatusLabel(Number(value))} variant="outlined" />,
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 200,
      getActions: ({ row }) => [
        <GridActionsCellItem key={`lines-${row.id}`} icon={<FormatListBulletedRoundedIcon />} label="Lines" onClick={() => onManageLines(row)} showInMenu={false} />,
        <GridActionsCellItem key={`shipments-${row.id}`} icon={<LocalShippingRoundedIcon />} label="View shipments" onClick={() => onViewShipments(row)} showInMenu={false} />,
        <GridActionsCellItem key={`invoice-${row.id}`} icon={<PostAddRoundedIcon />} label="Create invoice" onClick={() => onCreateInvoice(row)} showInMenu={false} />,
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'orderDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}