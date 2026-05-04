import { Box, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import type { VendorPaymentGridRow } from '../../../types/ui'

type VendorPaymentDataGridProps = {
  rows: VendorPaymentGridRow[]
  isLoading: boolean
  onSelectPayment?: (paymentId: string) => void
}

export default function VendorPaymentDataGrid({ rows, isLoading, onSelectPayment }: VendorPaymentDataGridProps) {
  const { t } = useTranslation()
  const columns: GridColDef<VendorPaymentGridRow>[] = [
    {
      field: 'paymentDate',
      headerName: t('components.vendorPayments.grid.columns.paymentDate'),
      minWidth: 130,
      flex: 0.7,
    },
    {
      field: 'supplierName',
      headerName: t('components.vendorPayments.grid.columns.supplier'),
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.supplierName ?? row.supplierId}</Typography>
          <Typography variant="body2" color="text.secondary">{row.invoiceNumber ?? row.purchaseInvoiceId}</Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: t('components.vendorPayments.grid.columns.amount'),
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value, row) => `${row.currencyCode} ${Number(value).toFixed(2)}`,
    },
    {
      field: 'paymentMethod',
      headerName: t('components.vendorPayments.grid.columns.method'),
      minWidth: 140,
      flex: 0.7,
      valueFormatter: (value) => (value ? String(value) : t('components.vendorPayments.grid.na')),
    },
    {
      field: 'referenceNumber',
      headerName: t('components.vendorPayments.grid.columns.reference'),
      minWidth: 160,
      flex: 0.8,
      valueFormatter: (value) => (value ? String(value) : t('components.vendorPayments.grid.na')),
    },
  ]

  return (
    <DataGrid
      autoHeight
      rows={rows}
      columns={columns}
      loading={isLoading}
      disableRowSelectionOnClick={!onSelectPayment}
      onRowClick={onSelectPayment ? ({ row }) => onSelectPayment(row.id) : undefined}
      pageSizeOptions={[5, 10, 25]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'paymentDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}
