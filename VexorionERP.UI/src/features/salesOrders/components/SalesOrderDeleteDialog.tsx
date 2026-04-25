import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { SalesOrderGridRow } from '../../../types/ui'

type SalesOrderDeleteDialogProps = {
  target: SalesOrderGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SalesOrderDeleteDialog({ target, isDeleting, onClose, onConfirm }: SalesOrderDeleteDialogProps) {
  return (
    <Dialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete sales order</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{target ? `Delete ${target.orderNumber}? This action cannot be undone.` : 'Delete this sales order?'}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  )
}