import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { CustomerGridRow } from '../../../types/ui'

type CustomerDeleteDialogProps = {
  target: CustomerGridRow | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function CustomerDeleteDialog({ target, isDeleting, onClose, onConfirm }: CustomerDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <VxDialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <VxDialogTitle>Delete customer</VxDialogTitle>
      <VxDialogContent>
        <VxTypography color="text.secondary">
          {target
            ? `Delete ${target.name}? This action cannot be undone.`
            : 'Delete this customer?'}
        </VxTypography>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isDeleting}>{t('dialogs.cancel')}</VxButton>
        <VxButton color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? t('dialogs.deleting') : t('dialogs.delete')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}