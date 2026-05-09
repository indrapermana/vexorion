import { DeleteOutlineRoundedIcon, DescriptionRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, PaidRoundedIcon } from '@vexorion/ui'
import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { getInvoiceStatusLabel, type SalesInvoiceGridRow } from '../../../types/ui'

type SalesInvoiceDataGridProps = {
  rows: SalesInvoiceGridRow[]
  isLoading: boolean
  onEdit: (salesInvoiceId: string) => void
  onDelete: (row: SalesInvoiceGridRow) => void
  onManageLines: (row: SalesInvoiceGridRow) => void
  onRecordPayment: (row: SalesInvoiceGridRow) => void
}

function getStatusColor(status: number) {
  if (status === 2) return 'primary' as const
  if (status === 3) return 'warning' as const
  if (status === 4) return 'success' as const
  if (status === 5 || status === 6) return 'error' as const
  return 'default' as const
}

export default function SalesInvoiceDataGrid({ rows, isLoading, onEdit, onDelete, onManageLines, onRecordPayment }: SalesInvoiceDataGridProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const columns: GridColDef<SalesInvoiceGridRow>[] = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice',
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.invoiceNumber}</Typography>
          <Typography variant="body2" color="text.secondary">{row.customerName ?? row.customerId}</Typography>
        </Box>
      ),
    },
    { field: 'invoiceDate', headerName: 'Invoice date', minWidth: 130, flex: 0.7 },
    { field: 'dueDate', headerName: 'Due date', minWidth: 130, flex: 0.7 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 150,
      flex: 0.8,
      renderCell: ({ value }) => <Chip size="small" color={getStatusColor(Number(value))} label={getInvoiceStatusLabel(Number(value))} variant="outlined" />,
    },
    {
      field: 'grandTotal',
      headerName: 'Total',
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    {
      field: 'balanceDue',
      headerName: 'Balance',
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 220,
      getActions: ({ row }) => [
        <GridActionsCellItem key={`lines-${row.id}`} icon={<FormatListBulletedRoundedIcon />} label="Lines" onClick={() => onManageLines(row)} showInMenu={false} />,
        <GridActionsCellItem key={`pay-${row.id}`} icon={<PaidRoundedIcon />} label="Record payment" onClick={() => onRecordPayment(row)} showInMenu={false} disabled={row.balanceDue <= 0} />,
        <GridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label="Edit" onClick={() => onEdit(row.id)} showInMenu={false} />,
        <GridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label="Delete" onClick={() => onDelete(row)} showInMenu={false} />,
        <GridActionsCellItem key={`doc-${row.id}`} icon={<DescriptionRoundedIcon />} label="Invoice" onClick={() => onManageLines(row)} showInMenu />,
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'invoiceDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}