import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderGridRow } from '../../../types/ui'

type PurchaseOrderDeleteDialogProps = {
  target: PurchaseOrderGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function PurchaseOrderDeleteDialog({ target, isDeleting, onClose, onConfirm }: PurchaseOrderDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete purchase order" targetName={target?.orderNumber ?? ''} consequence="This permanently removes the draft order and its lines. Related invoices or receipts may prevent deletion." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
