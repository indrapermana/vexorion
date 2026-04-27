import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { Chip } from '@mui/material'
import { DataGrid, GridActionsCellItem, type GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import type { JournalGridRow } from '../../../types/ui'

function getJournalStatusLabel(status: number) {
  if (status === 1) return 'Draft'
  if (status === 2) return 'Posted'
  if (status === 3) return 'Reversed'
  return `Status ${status}`
}

type JournalDataGridProps = {
  rows: JournalGridRow[]
  isLoading: boolean
  onOpen: (journalEntryId: string) => void
}

export default function JournalDataGrid({ rows, isLoading, onOpen }: JournalDataGridProps) {
  useTranslation()
  const columns: GridColDef<JournalGridRow>[] = [
    { field: 'journalNumber', headerName: 'Journal', minWidth: 160, flex: 0.7 },
    { field: 'postingDate', headerName: 'Posting date', minWidth: 130, flex: 0.6 },
    { field: 'sourceDocumentType', headerName: 'Source type', minWidth: 160, flex: 0.7 },
    { field: 'totalDebit', headerName: 'Debit', minWidth: 120, flex: 0.5, type: 'number', valueFormatter: (value) => Number(value).toFixed(2) },
    { field: 'totalCredit', headerName: 'Credit', minWidth: 120, flex: 0.5, type: 'number', valueFormatter: (value) => Number(value).toFixed(2) },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.5,
      renderCell: ({ row }) => (
        <Chip size="small" color={row.status === 2 ? 'success' : row.status === 3 ? 'default' : 'primary'} label={getJournalStatusLabel(row.status)} />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      minWidth: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem key={`open-${row.id}`} icon={<VisibilityRoundedIcon />} label="View" onClick={() => onOpen(row.id)} showInMenu={false} />,
      ],
    },
  ]

  return (
    <DataGrid
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
