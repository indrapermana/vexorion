import { DeleteOutlineRoundedIcon, PublishRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxChip } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SalesShipmentGridRow } from '../../../types/ui'

function getStatusLabel(status: number) {
  if (status === 1) return 'Draft'
  if (status === 4) return 'Shipped'
  return 'Unknown'
}

function getStatusColor(status: number): 'default' | 'warning' | 'success' {
  if (status === 4) return 'success'
  if (status === 1) return 'warning'
  return 'default'
}

type SalesShipmentDataGridProps = {
  rows: SalesShipmentGridRow[]
  isLoading: boolean
  onPost: (row: SalesShipmentGridRow) => void
  onDelete: (row: SalesShipmentGridRow) => void
}

export default function SalesShipmentDataGrid({ rows, isLoading, onPost, onDelete }: SalesShipmentDataGridProps) {
  useTranslation()
  const columns: VxGridColDef<SalesShipmentGridRow>[] = [
    { field: 'shipmentNumber', headerName: 'Shipment #', minWidth: 160, flex: 1 },
    { field: 'shipmentDate', headerName: 'Date', minWidth: 130, flex: 0.7 },
    { field: 'warehouseName', headerName: 'Warehouse', minWidth: 160, flex: 1 },
    { field: 'lineCount', headerName: 'Lines', minWidth: 80, flex: 0.5, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => (
        <VxChip size="small" label={getStatusLabel(Number(value))} color={getStatusColor(Number(value))} variant="outlined" />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      minWidth: 100,
      getActions: ({ row }) => [
        <VxGridActionsCellItem
          key={`post-${row.id}`}
          icon={<PublishRoundedIcon />}
          label="Ship"
          disabled={row.status !== 1}
          onClick={() => onPost(row)}
          showInMenu={false}
        />,
        <VxGridActionsCellItem
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
    <VxDataGrid
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
