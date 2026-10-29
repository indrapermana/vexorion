import { useState } from 'react'
import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
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
  const [nameError, setNameError] = useState<string | null>(null)

  const closeDialog = () => {
    setNameError(null)
    onClose()
  }

  const createCustomer = () => {
    if (!quickCustomer.name.trim()) {
      setNameError(t('quickCustomer.nameRequired'))
      return
    }

    setNameError(null)
    onCreate()
  }

  return (
    <VxDialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth scroll="paper" aria-describedby="quick-customer-hint">
      <VxDialogTitle>{t('quickCustomer.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={1.5} sx={{ mt: 1 }}>
          <VxTypography id="quick-customer-hint" variant="body2" color="text.secondary">{t('quickCustomer.hint')}</VxTypography>
          <VxTextField
            autoFocus
            required
            label={t('quickCustomer.name')}
            value={quickCustomer.name}
            error={nameError !== null}
            helperText={nameError ?? ' '}
            onChange={(event) => { setNameError(null); onChange({ ...quickCustomer, name: event.target.value }) }}
            onKeyDown={(event) => { if (event.key === 'Enter') createCustomer() }}
          />
          <VxTextField type="tel" label={t('quickCustomer.phone')} value={quickCustomer.phoneNumber} onChange={(event) => onChange({ ...quickCustomer, phoneNumber: event.target.value })} />
          <VxTextField type="email" label={t('quickCustomer.email')} value={quickCustomer.email} onChange={(event) => onChange({ ...quickCustomer, email: event.target.value })} />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <VxButton onClick={closeDialog} sx={{ minHeight: 44 }}>{t('common.cancel')}</VxButton>
        <VxButton onClick={createCustomer} variant="contained" sx={{ minHeight: 44 }}>{t('common.create')}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
