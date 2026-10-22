import { EditRoundedIcon, LockOpenRoundedIcon, LockRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxChip } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { FiscalPeriodGridRow } from '../../../types/ui'

type FiscalPeriodDataGridProps = {
  rows: FiscalPeriodGridRow[]
  isLoading: boolean
  onEdit: (fiscalPeriodId: string) => void
  onClosePeriod: (row: FiscalPeriodGridRow) => void
  onReopenPeriod: (row: FiscalPeriodGridRow) => void
  canManage?: boolean
}

export default function FiscalPeriodDataGrid({ rows, isLoading, onEdit, onClosePeriod, onReopenPeriod, canManage = true }: FiscalPeriodDataGridProps) {
  useTranslation()
  const columns: VxGridColDef<FiscalPeriodGridRow>[] = [
    { field: 'periodCode', headerName: 'Period', minWidth: 130, flex: 0.5 },
    { field: 'startDate', headerName: 'Start date', minWidth: 130, flex: 0.5 },
    { field: 'endDate', headerName: 'End date', minWidth: 130, flex: 0.5 },
    {
      field: 'isClosed',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.4,
      renderCell: ({ row }) => (
        <VxChip size="small" color={row.isClosed ? 'default' : 'success'} label={row.isClosed ? 'Closed' : 'Open'} />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 180,
      getActions: ({ row }) => canManage ? [
        <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label="Edit" onClick={() => onEdit(row.id)} showInMenu={false} />,
        row.isClosed
          ? <VxGridActionsCellItem key={`reopen-${row.id}`} icon={<LockOpenRoundedIcon />} label="Reopen" onClick={() => onReopenPeriod(row)} showInMenu={false} />
          : <VxGridActionsCellItem key={`close-${row.id}`} icon={<LockRoundedIcon />} label="Close" onClick={() => onClosePeriod(row)} showInMenu={false} />,
      ] : [],
    },
  ]

  return (
    <VxDataGrid
      autoHeight
      rows={rows}
      columns={columns}
      loading={isLoading}
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
      showToolbar
      slotProps={{ toolbar: { showQuickFilter: true } }}
      sx={{ border: 'none' }}
    />
  )
}
