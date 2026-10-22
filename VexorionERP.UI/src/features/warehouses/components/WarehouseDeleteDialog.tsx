import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { WarehouseGridRow } from '../../../types/ui'

type WarehouseDeleteDialogProps = {
  target: WarehouseGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function WarehouseDeleteDialog({ target, isDeleting, onClose, onConfirm }: WarehouseDeleteDialogProps) {
  const { t } = useTranslation()

  return <VxConfirmActionDialog open={Boolean(target)} title="Delete warehouse" targetName={target ? `${target.name} (${target.code})` : ''} consequence="This permanently removes the warehouse. Inventory balances or transactions may prevent deletion." confirmLabel={t('dialogs.delete')} pendingLabel={t('dialogs.deleting')} pending={isDeleting} onClose={onClose} onConfirm={onConfirm} />
}
