import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxTypography } from '@vexorion/ui'
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
    <VxDialog open={Boolean(target)} onClose={isDeleting ? undefined : onClose} fullWidth maxWidth="xs">
      <VxDialogTitle>Delete sales invoice</VxDialogTitle>
      <VxDialogContent>
        <VxTypography color="text.secondary">{target ? `Delete ${target.invoiceNumber}? This action cannot be undone.` : 'Delete this sales invoice?'}</VxTypography>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isDeleting}>{t('dialogs.cancel')}</VxButton>
        <VxButton color="error" variant="contained" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? t('dialogs.deleting') : t('dialogs.delete')}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}