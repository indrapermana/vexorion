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

  return <VxConfirmActionDialog open={Boolean(target)} title={t('pages.deleteConfirmations.customer.title')} targetName={target?.name ?? ''} consequence={t('pages.deleteConfirmations.customer.consequence')} confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
