import { VisibilityRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxChip } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { JournalGridRow } from '../../../types/ui'

type JournalDataGridProps = {
  rows: JournalGridRow[]
  isLoading: boolean
  onOpen: (journalEntryId: string) => void
}

export default function JournalDataGrid({ rows, isLoading, onOpen }: JournalDataGridProps) {
  const { t } = useTranslation()
  const columns: VxGridColDef<JournalGridRow>[] = [
    { field: 'journalNumber', headerName: t('pages.journals.grid.journal'), minWidth: 160, flex: 0.7 },
    { field: 'postingDate', headerName: t('pages.journals.grid.postingDate'), minWidth: 130, flex: 0.6 },
    { field: 'sourceDocumentType', headerName: t('pages.journals.grid.sourceType'), minWidth: 160, flex: 0.7 },
    { field: 'totalDebit', headerName: t('pages.journals.grid.debit'), minWidth: 120, flex: 0.5, type: 'number', valueFormatter: (value) => Number(value).toFixed(2) },
    { field: 'totalCredit', headerName: t('pages.journals.grid.credit'), minWidth: 120, flex: 0.5, type: 'number', valueFormatter: (value) => Number(value).toFixed(2) },
    {
      field: 'status',
      headerName: t('pages.journals.grid.status'),
      minWidth: 120,
      flex: 0.5,
      renderCell: ({ row }) => (
        <VxChip
          size="small"
          color={row.status === 2 ? 'success' : row.status === 3 ? 'default' : 'primary'}
          label={row.status === 1
            ? t('pages.journals.grid.draft')
            : row.status === 2
              ? t('pages.journals.grid.posted')
              : row.status === 3
                ? t('pages.journals.grid.reversed')
                : t('pages.journals.grid.unknownStatus', { status: row.status })}
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('pages.journals.grid.actions'),
      minWidth: 90,
      getActions: ({ row }) => [
        <VxGridActionsCellItem key={`open-${row.id}`} icon={<VisibilityRoundedIcon />} label={t('pages.journals.grid.view')} onClick={() => onOpen(row.id)} showInMenu={false} />,
      ],
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="journals"
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
