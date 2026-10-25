import { DeleteOutlineRoundedIcon, PublishRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import DocumentLifecycleChip from '../../../components/DocumentLifecycleChip'
import type { SalesShipmentGridRow } from '../../../types/ui'

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
  canManage?: boolean
}

export default function SalesShipmentDataGrid({ rows, isLoading, onPost, onDelete, canManage = true }: SalesShipmentDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<SalesShipmentGridRow>[] = [
    { field: 'shipmentNumber', headerName: t('pages.salesShipments.grid.number'), minWidth: 160, flex: 1 },
    { field: 'shipmentDate', headerName: t('pages.salesShipments.grid.date'), minWidth: 130, flex: 0.7 },
    { field: 'warehouseName', headerName: t('pages.salesShipments.grid.warehouse'), minWidth: 160, flex: 1 },
    { field: 'lineCount', headerName: t('pages.salesShipments.grid.lines'), minWidth: 80, flex: 0.5, type: 'number' },
    {
      field: 'status',
      headerName: t('pages.salesShipments.grid.status'),
      minWidth: 120,
      flex: 0.7,
      renderCell: ({ value }) => <DocumentLifecycleChip kind="shipment" status={Number(value)} label={Number(value) === 1 ? t('pages.salesShipments.grid.draft') : Number(value) === 4 ? t('pages.salesShipments.grid.shipped') : t('pages.salesShipments.grid.unknown')} color={getStatusColor(Number(value))} />,
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
          label={row.status !== 1 ? `${t('pages.salesShipments.grid.ship')} — ${t('orderWorkflow.disabledReasons.shipment.postDraftOnly')}` : t('pages.salesShipments.grid.ship')}
          disabled={row.status !== 1}
          onClick={() => onPost(row)}
          showInMenu={false}
        />,
        <VxGridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteOutlineRoundedIcon />}
          label={row.status !== 1 ? `${t('pages.salesShipments.grid.delete')} — ${t('orderWorkflow.disabledReasons.shipment.deleteDraftOnly')}` : t('pages.salesShipments.grid.delete')}
          disabled={row.status !== 1}
          onClick={() => onDelete(row)}
          showInMenu={false}
        />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="sales-shipments"
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
