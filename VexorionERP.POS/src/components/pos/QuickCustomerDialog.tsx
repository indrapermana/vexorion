import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'
import type { QuickCustomerForm } from './types'

type QuickCustomerDialogProps = {
  open: boolean
  quickCustomer: QuickCustomerForm
  onClose: () => void
  onChange: (value: QuickCustomerForm) => void
  onCreate: () => void
}

export function QuickCustomerDialog({ open, quickCustomer, onClose, onChange, onCreate }: QuickCustomerDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('quickCustomer.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField label={t('quickCustomer.name')} value={quickCustomer.name} onChange={(event) => onChange({ ...quickCustomer, name: event.target.value })} />
          <TextField label={t('quickCustomer.phone')} value={quickCustomer.phoneNumber} onChange={(event) => onChange({ ...quickCustomer, phoneNumber: event.target.value })} />
          <TextField label={t('quickCustomer.email')} value={quickCustomer.email} onChange={(event) => onChange({ ...quickCustomer, email: event.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={onCreate} variant="contained">{t('common.create')}</Button>
      </DialogActions>
    </Dialog>
  )
}
