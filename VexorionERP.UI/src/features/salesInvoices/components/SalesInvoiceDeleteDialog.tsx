import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SalesInvoiceGridRow } from '../../../types/ui'

type SalesInvoiceDeleteDialogProps = {
  target: SalesInvoiceGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SalesInvoiceDeleteDialog({ target, isDeleting, onClose, onConfirm }: SalesInvoiceDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete sales invoice" targetName={target?.invoiceNumber ?? ''} consequence="This permanently removes the draft invoice and its lines. Posted invoices cannot be deleted." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
