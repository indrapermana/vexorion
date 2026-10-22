import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SupplierGridRow } from '../../../types/ui'

type SupplierDeleteDialogProps = {
  target: SupplierGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SupplierDeleteDialog({ target, isDeleting, onClose, onConfirm }: SupplierDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title={t('pages.deleteConfirmations.supplier.title')} targetName={target?.name ?? ''} consequence={t('pages.deleteConfirmations.supplier.consequence')} confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
