import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type InventoryAdjustmentStateActionsProps = {
  open: boolean
  targetName: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function InventoryAdjustmentStateActions({ open, targetName, pending, onClose, onConfirm }: InventoryAdjustmentStateActionsProps) {
  const { t } = useTranslation()

  return (
    <VxConfirmActionDialog
      open={open}
      title={t('pages.inventoryAdjustments.editor.deleteTitle')}
      targetName={targetName}
      consequence={t('pages.inventoryAdjustments.editor.deleteConsequence')}
      confirmLabel={t('pages.inventoryAdjustments.editor.deleteConfirm')}
      pendingLabel={t('pages.inventoryAdjustments.linePanel.deleting')}
      pending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}