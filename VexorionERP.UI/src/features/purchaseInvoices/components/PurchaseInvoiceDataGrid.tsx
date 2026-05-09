import { DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, PaidRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxBox, VxChip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { getInvoiceStatusLabel, type PurchaseInvoiceGridRow } from '../../../types/ui'
import { useCurrency } from '../../../app/CurrencyContext'

type PurchaseInvoiceDataGridProps = {
  rows: PurchaseInvoiceGridRow[]
  isLoading: boolean
  onEdit: (purchaseInvoiceId: string) => void
  onDelete: (row: PurchaseInvoiceGridRow) => void
  onManageLines: (row: PurchaseInvoiceGridRow) => void
  onRecordPayment: (row: PurchaseInvoiceGridRow) => void
}

function getStatusColor(status: number) {
  if (status === 2) return 'primary' as const
  if (status === 3) return 'warning' as const
  if (status === 4) return 'success' as const
  if (status === 5 || status === 6) return 'error' as const
  return 'default' as const
}

export default function PurchaseInvoiceDataGrid({ rows, isLoading, onEdit, onDelete, onManageLines, onRecordPayment }: PurchaseInvoiceDataGridProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const columns: VxGridColDef<PurchaseInvoiceGridRow>[] = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice',
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.invoiceNumber}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">{row.supplierName ?? row.supplierId}</VxTypography>
        </VxBox>
      ),
    },
    { field: 'invoiceDate', headerName: 'Invoice date', minWidth: 130, flex: 0.7 },
    { field: 'dueDate', headerName: 'Due date', minWidth: 130, flex: 0.7 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 150,
      flex: 0.8,
      renderCell: ({ value }) => <VxChip size="small" color={getStatusColor(Number(value))} label={getInvoiceStatusLabel(Number(value))} variant="outlined" />,
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
      minWidth: 210,
      getActions: ({ row }) => [
        <VxGridActionsCellItem key={`lines-${row.id}`} icon={<FormatListBulletedRoundedIcon />} label="Lines" onClick={() => onManageLines(row)} showInMenu={false} />,
        <VxGridActionsCellItem key={`pay-${row.id}`} icon={<PaidRoundedIcon />} label="Record payment" onClick={() => onRecordPayment(row)} showInMenu={false} disabled={row.balanceDue <= 0} />,
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label="Edit" onClick={() => onEdit(row.id)} showInMenu={false} />,
        <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label="Delete" onClick={() => onDelete(row)} showInMenu={false} />,
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'invoiceDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}