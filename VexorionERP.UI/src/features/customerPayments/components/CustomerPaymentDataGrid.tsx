import { VxBox, VxTypography } from '@vexorion/ui'
import { VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { CustomerPaymentGridRow } from '../../../types/ui'

type CustomerPaymentDataGridProps = {
  rows: CustomerPaymentGridRow[]
  isLoading: boolean
  onSelectPayment?: (paymentId: string) => void
}

export default function CustomerPaymentDataGrid({ rows, isLoading, onSelectPayment }: CustomerPaymentDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<CustomerPaymentGridRow>[] = [
    {
      field: 'paymentDate',
      headerName: t('components.customerPayments.grid.columns.paymentDate'),
      minWidth: 130,
      flex: 0.7,
    },
    {
      field: 'customerName',
      headerName: t('components.customerPayments.grid.columns.customer'),
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.customerName ?? row.customerId}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">{row.invoiceNumber ?? row.salesInvoiceId}</VxTypography>
        </VxBox>
      ),
    },
    {
      field: 'amount',
      headerName: t('components.customerPayments.grid.columns.amount'),
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value, row) => `${row.currencyCode} ${Number(value).toFixed(2)}`,
    },
    {
      field: 'paymentMethod',
      headerName: t('components.customerPayments.grid.columns.method'),
      minWidth: 140,
      flex: 0.7,
      valueFormatter: (value) => (value ? String(value) : t('components.customerPayments.grid.na')),
    },
    {
      field: 'referenceNumber',
      headerName: t('components.customerPayments.grid.columns.reference'),
      minWidth: 160,
      flex: 0.8,
      valueFormatter: (value) => (value ? String(value) : t('components.customerPayments.grid.na')),
    },
  ]

  return (
    <VxDataGrid
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
