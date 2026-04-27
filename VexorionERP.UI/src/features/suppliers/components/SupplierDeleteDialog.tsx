import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
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

  return (
    <Dialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete supplier</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          {target ? `Delete ${target.name}? This action cannot be undone.` : 'Delete this supplier?'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>{t('dialogs.cancel')}</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? t('dialogs.deleting') : t('dialogs.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}