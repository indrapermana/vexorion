import { DeleteOutlineRoundedIcon, PublishRoundedIcon } from '@vexorion/ui'
import { Chip } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import type { PurchaseReceiptGridRow } from '../../../types/ui'

function getStatusLabel(status: number) {
  if (status === 1) return 'Draft'
  if (status === 4) return 'Posted'
  return 'Unknown'
}

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
}

export default function PurchaseReceiptDataGrid({ rows, isLoading, onPost, onDelete }: PurchaseReceiptDataGridProps) {
  useTranslation()
  const columns: GridColDef<PurchaseReceiptGridRow>[] = [
    { field: 'receiptNumber', headerName: 'Receipt #', minWidth: 160, flex: 1 },
    { field: 'receiptDate', headerName: 'Date', minWidth: 130, flex: 0.7 },
    { field: 'warehouseName', headerName: 'Warehouse', minWidth: 160, flex: 1 },
    { field: 'lineCount', headerName: 'Lines', minWidth: 80, flex: 0.5, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => (
        <Chip size="small" label={getStatusLabel(Number(value))} color={getStatusColor(Number(value))} variant="outlined" />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      minWidth: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key={`post-${row.id}`}
          icon={<PublishRoundedIcon />}
          label="Post"
          disabled={row.status !== 1}
          onClick={() => onPost(row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label="Delete"
          disabled={row.status !== 1}
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
      ],
    },
  ]

  return (
    <DataGrid
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
