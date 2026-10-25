import { DeleteOutlineRoundedIcon, DescriptionRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, PaidRoundedIcon, VxDataGrid, VxGridActionsCellItem, type VxGridColDef } from '@vexorion/ui'
import { VxBox, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { getInvoiceStatusLabel, type SalesInvoiceGridRow } from '../../../types/ui'
import { getInvoicePaymentBlockReason } from '../../../types/ui/salesInvoices'
import DocumentLifecycleChip from '../../../components/DocumentLifecycleChip'

type SalesInvoiceDataGridProps = {
  rows: SalesInvoiceGridRow[]
  isLoading: boolean
  onEdit: (salesInvoiceId: string) => void
  onDelete: (row: SalesInvoiceGridRow) => void
  onManageLines: (row: SalesInvoiceGridRow) => void
  onRecordPayment: (row: SalesInvoiceGridRow) => void
  canManage?: boolean
}

function getStatusColor(status: number) {
  if (status === 2) return 'primary' as const
  if (status === 3) return 'warning' as const
  if (status === 4) return 'success' as const
  if (status === 5 || status === 6) return 'error' as const
  return 'default' as const
}

export default function SalesInvoiceDataGrid({ rows, isLoading, onEdit, onDelete, onManageLines, onRecordPayment, canManage = true }: SalesInvoiceDataGridProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const columns: VxGridColDef<SalesInvoiceGridRow>[] = [
    {
      field: 'invoiceNumber',
      headerName: t('orderWorkflow.invoice'),
      minWidth: 180,
      flex: 1,
      renderCell: ({ row }) => (
        <VxBox sx={{ py: 1 }}>
          <VxTypography sx={{ fontWeight: 700 }}>{row.invoiceNumber}</VxTypography>
          <VxTypography variant="body2" color="text.secondary">{row.customerName ?? row.customerId}</VxTypography>
        </VxBox>
      ),
    },
    { field: 'invoiceDate', headerName: t('orderWorkflow.invoiceDate'), minWidth: 130, flex: 0.7 },
    { field: 'dueDate', headerName: t('orderWorkflow.dueDate'), minWidth: 130, flex: 0.7 },
    {
      field: 'status',
      headerName: t('common.labels.status'),
      minWidth: 150,
      flex: 0.8,
      renderCell: ({ value }) => <DocumentLifecycleChip kind="invoice" status={Number(value)} color={getStatusColor(Number(value))} label={getInvoiceStatusLabel(Number(value))} />,
    },
    {
      field: 'grandTotal',
      headerName: t('orderWorkflow.total'),
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    {
      field: 'balanceDue',
      headerName: t('orderWorkflow.balance'),
      minWidth: 130,
      flex: 0.7,
      type: 'number',
      valueFormatter: (value) => formatMoney(Number(value)),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('common.actions'),
      minWidth: 220,
      getActions: ({ row }) => {
        const paymentBlockReason = getInvoicePaymentBlockReason(row.status, row.balanceDue)
        return [
        <VxGridActionsCellItem key={`lines-${row.id}`} icon={<FormatListBulletedRoundedIcon />} label={t('orderWorkflow.lines')} onClick={() => onManageLines(row)} showInMenu={false} />,
        ...(canManage ? [
          <VxGridActionsCellItem key={`pay-${row.id}`} icon={<PaidRoundedIcon />} label={paymentBlockReason ? `${t('orderWorkflow.recordPayment')} — ${t(`orderWorkflow.disabledReasons.invoicePayment.${paymentBlockReason}`)}` : t('orderWorkflow.recordPayment')} onClick={() => onRecordPayment(row)} showInMenu={false} disabled={Boolean(paymentBlockReason)} />,
          <VxGridActionsCellItem key={`edit-${row.id}`} icon={<EditRoundedIcon />} label={t('common.edit')} onClick={() => onEdit(row.id)} showInMenu={false} />,
          <VxGridActionsCellItem key={`delete-${row.id}`} icon={<DeleteOutlineRoundedIcon />} label={t('common.delete')} onClick={() => onDelete(row)} showInMenu={false} />,
        ] : []),
        <VxGridActionsCellItem key={`doc-${row.id}`} icon={<DescriptionRoundedIcon />} label={t('orderWorkflow.invoice')} onClick={() => onManageLines(row)} showInMenu />,
        ]
      },
    },
  ]

  return (
    <VxDataGrid
      preferenceKey="sales-invoices"
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
