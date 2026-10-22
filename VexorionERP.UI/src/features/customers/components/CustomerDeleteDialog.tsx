import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { CustomerGridRow } from '../../../types/ui'

type CustomerDeleteDialogProps = {
  target: CustomerGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function CustomerDeleteDialog({ target, isDeleting, onClose, onConfirm }: CustomerDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete customer" targetName={target?.name ?? ''} consequence="This permanently removes the customer. Existing transactions may prevent deletion." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
