import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { PurchaseInvoiceGridRow } from '../../../types/ui'

type PurchaseInvoiceDeleteDialogProps = {
  target: PurchaseInvoiceGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function PurchaseInvoiceDeleteDialog({ target, isDeleting, onClose, onConfirm }: PurchaseInvoiceDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title={t('pages.purchaseInvoices.delete.title')} targetName={target?.invoiceNumber ?? ''} consequence={t('pages.purchaseInvoices.delete.consequence')} confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
