import { Box, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import type { CustomerPaymentGridRow } from '../../../types/ui'

type CustomerPaymentDataGridProps = {
  rows: CustomerPaymentGridRow[]
  isLoading: boolean
}

export default function CustomerPaymentDataGrid({ rows, isLoading }: CustomerPaymentDataGridProps) {
  const columns: GridColDef<CustomerPaymentGridRow>[] = [
    {
      field: 'paymentDate',
      headerName: 'Payment date',
      minWidth: 130,
      flex: 0.7,
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.customerName ?? row.customerId}</Typography>
          <Typography variant="body2" color="text.secondary">{row.invoiceNumber ?? row.salesInvoiceId}</Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value, row) => `${row.currencyCode} ${Number(value).toFixed(2)}`,
    },
    {
      field: 'paymentMethod',
      headerName: 'Method',
      minWidth: 140,
      flex: 0.7,
      valueFormatter: (value) => (value ? String(value) : 'N/A'),
    },
    {
      field: 'referenceNumber',
      headerName: 'Reference',
      minWidth: 160,
      flex: 0.8,
      valueFormatter: (value) => (value ? String(value) : 'N/A'),
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'paymentDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}
