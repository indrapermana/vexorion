import { Box, Chip, Typography } from '@vexorion/ui'
import { DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, LocalShippingRoundedIcon, PostAddRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { getDocumentStatusLabel, type PurchaseOrderGridRow } from '../../../types/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'

type PurchaseOrderDataGridProps = {
  rows: PurchaseOrderGridRow[]
  isLoading: boolean
  onEdit: (purchaseOrderId: string) => void
  onDelete: (row: PurchaseOrderGridRow) => void
  onManageLines: (row: PurchaseOrderGridRow) => void
  onCreateInvoice: (row: PurchaseOrderGridRow) => void
  onViewReceipts: (row: PurchaseOrderGridRow) => void
}

function getStatusColor(status: number) {
  if (status === 2) return 'primary' as const
  if (status === 4) return 'success' as const
  if (status === 5) return 'error' as const
  return 'default' as const
}

export default function PurchaseOrderDataGrid({ rows, isLoading, onEdit, onDelete, onManageLines, onCreateInvoice, onViewReceipts }: PurchaseOrderDataGridProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const columns: VxGridColDef<PurchaseOrderGridRow>[] = [
    {
      field: 'orderNumber',
      headerName: 'Order',
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{row.orderNumber}</Typography>
          <Typography variant="body2" color="text.secondary">{row.supplierName ?? row.supplierId}</Typography>
        </Box>
      ),
    },
    { field: 'orderDate', headerName: 'Order date', minWidth: 130, flex: 0.7 },
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
        <VxGridActionsCellItem key={`lines-${row.id}`} icon={<FormatListBulletedRoundedIcon />} label="Lines" onClick={() => onManageLines(row)} showInMenu={false} />,
        <VxGridActionsCellItem key={`receipts-${row.id}`} icon={<LocalShippingRoundedIcon />} label="View receipts" onClick={() => onViewReceipts(row)} showInMenu={false} />,
        <VxGridActionsCellItem key={`invoice-${row.id}`} icon={<PostAddRoundedIcon />} label="Create invoice" onClick={() => onCreateInvoice(row)} showInMenu={false} />,
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
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } }, sorting: { sortModel: [{ field: 'orderDate', sort: 'desc' }] } }}
      showToolbar
      sx={{ border: 'none', '--DataGrid-containerBackground': 'transparent', '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(108, 92, 231, 0.06)', borderBottom: '1px solid rgba(108, 92, 231, 0.08)' }, '& .MuiDataGrid-cell': { borderColor: 'rgba(108, 92, 231, 0.06)' } }}
      slotProps={{ toolbar: { showQuickFilter: true } }}
    />
  )
}