import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import type { CustomerGridRow } from '../../../types/ui'

type CustomerDeleteDialogProps = {
  target: CustomerGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function CustomerDeleteDialog({ target, isDeleting, onClose, onConfirm }: CustomerDeleteDialogProps) {
  return (
    <Dialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete customer</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          {target
            ? `Delete ${target.name}? This action cannot be undone.`
            : 'Delete this customer?'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}