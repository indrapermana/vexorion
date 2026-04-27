import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
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

  return (
    <Dialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete purchase order</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{target ? `Delete ${target.orderNumber}? This action cannot be undone.` : 'Delete this purchase order?'}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>{t('dialogs.cancel')}</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? t('dialogs.deleting') : t('dialogs.delete')}</Button>
      </DialogActions>
    </Dialog>
  )
}