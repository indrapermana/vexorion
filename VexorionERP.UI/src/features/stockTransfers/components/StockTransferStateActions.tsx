import { VxConfirmActionDialog } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type StockTransferStateActionsProps = {
  open: boolean
  targetName: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function StockTransferStateActions({ open, targetName, pending, onClose, onConfirm }: StockTransferStateActionsProps) {
  const { t } = useTranslation()

  return (
    <VxConfirmActionDialog
      open={open}
      title={t('pages.stockTransfers.delete.title')}
      targetName={targetName}
      consequence={t('pages.stockTransfers.delete.consequence')}
      confirmLabel={t('pages.stockTransfers.delete.confirm')}
      pendingLabel={t('pages.stockTransfers.delete.deleting')}
      pending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}