import { DeleteOutlineRoundedIcon, PublishRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxChip } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { PurchaseReceiptGridRow } from '../../../types/ui'

function getStatusColor(status: number): 'default' | 'warning' | 'success' {
  if (status === 4) return 'success'
  if (status === 1) return 'warning'
  return 'default'
}

type PurchaseReceiptDataGridProps = {
  rows: PurchaseReceiptGridRow[]
  isLoading: boolean
  onPost: (row: PurchaseReceiptGridRow) => void
  onDelete: (row: PurchaseReceiptGridRow) => void
  canManage?: boolean
}

export default function PurchaseReceiptDataGrid({ rows, isLoading, onPost, onDelete, canManage = true }: PurchaseReceiptDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<PurchaseReceiptGridRow>[] = [
    { field: 'receiptNumber', headerName: t('pages.purchaseReceipts.grid.number'), minWidth: 160, flex: 1 },
    { field: 'receiptDate', headerName: t('pages.purchaseReceipts.grid.date'), minWidth: 130, flex: 0.7 },
    { field: 'warehouseName', headerName: t('pages.purchaseReceipts.grid.warehouse'), minWidth: 160, flex: 1 },
    { field: 'lineCount', headerName: t('pages.purchaseReceipts.grid.lines'), minWidth: 80, flex: 0.5, type: 'number' },
    {
      field: 'status',
      headerName: t('pages.purchaseReceipts.grid.status'),
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => (
        <VxChip size="small" label={Number(value) === 1 ? t('pages.purchaseReceipts.grid.draft') : Number(value) === 4 ? t('pages.purchaseReceipts.grid.posted') : t('pages.purchaseReceipts.grid.unknown')} color={getStatusColor(Number(value))} variant="outlined" />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      minWidth: 100,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem
          key={`post-${row.id}`}
          icon={<PublishRoundedIcon />}
          label={t('pages.purchaseReceipts.grid.post')}
          disabled={row.status !== 1}
          onClick={() => onPost(row)}
          showInMenu={false}
        />,
        <VxGridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label={t('pages.purchaseReceipts.grid.delete')}
          disabled={row.status !== 1}
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="purchase-receipts"
      rows={rows}
      columns={columns}
      loading={isLoading}
      autoHeight
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
      getRowHeight={() => 'auto'}
    />
  )
}
