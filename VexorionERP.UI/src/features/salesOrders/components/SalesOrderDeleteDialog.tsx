import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SalesOrderGridRow } from '../../../types/ui'

type SalesOrderDeleteDialogProps = {
  target: SalesOrderGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SalesOrderDeleteDialog({ target, isDeleting, onClose, onConfirm }: SalesOrderDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete sales order" targetName={target?.orderNumber ?? ''} consequence="This permanently removes the draft order and its lines. Related invoices or shipments may prevent deletion." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
