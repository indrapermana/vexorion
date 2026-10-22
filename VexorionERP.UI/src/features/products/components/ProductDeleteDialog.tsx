import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProductGridRow } from '../../../types/ui'

type ProductDeleteDialogProps = {
  target: ProductGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ProductDeleteDialog({ target, isDeleting, onClose, onConfirm }: ProductDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete product" targetName={target ? `${target.name} (${target.sku})` : ''} consequence="This permanently removes the product and its stored image. Existing transactions may prevent deletion." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
