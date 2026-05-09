import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField } from '@vexorion/ui'
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
    <VxDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <VxDialogTitle>{t('quickCustomer.title')}</VxDialogTitle>
      <VxDialogContent>
        <VxStack spacing={1.5} sx={{ mt: 1 }}>
          <VxTextField label={t('quickCustomer.name')} value={quickCustomer.name} onChange={(event) => onChange({ ...quickCustomer, name: event.target.value })} />
          <VxTextField label={t('quickCustomer.phone')} value={quickCustomer.phoneNumber} onChange={(event) => onChange({ ...quickCustomer, phoneNumber: event.target.value })} />
          <VxTextField label={t('quickCustomer.email')} value={quickCustomer.email} onChange={(event) => onChange({ ...quickCustomer, email: event.target.value })} />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={onClose}>{t('common.cancel')}</VxButton>
        <VxButton onClick={onCreate} variant="contained">{t('common.create')}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
