import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { SalesInvoiceGridRow } from '../../../types/ui'

type SalesInvoiceDeleteDialogProps = {
  target: SalesInvoiceGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SalesInvoiceDeleteDialog({ target, isDeleting, onClose, onConfirm }: SalesInvoiceDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete sales invoice</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{target ? `Delete ${target.invoiceNumber}? This action cannot be undone.` : 'Delete this sales invoice?'}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>{t('dialogs.cancel')}</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? t('dialogs.deleting') : t('dialogs.delete')}</Button>
      </DialogActions>
    </Dialog>
  )
}