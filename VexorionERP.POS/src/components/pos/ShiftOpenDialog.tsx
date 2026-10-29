import { useState } from 'react'
import { LockOpenRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxInputAdornment, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'

type Props = {
  open: boolean
  currencyCode: string
  cashierName: string
  onOpen: (openingFloat: number) => void
}

export function ShiftOpenDialog({ open, currencyCode, cashierName, onOpen }: Props) {
  const { t } = useI18n()
  const [floatValue, setFloatValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const handleSubmit = () => {
    const parsed = parseFloat(floatValue)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setInputError(t('shift.open.invalidAmount'))
      return
    }
    setInputError(null)
    setFloatValue('')
    onOpen(parsed)
  }

  return (
    <VxDialog open={open} maxWidth="xs" fullWidth scroll="paper" aria-describedby="shift-open-consequence">
      <VxDialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockOpenRoundedIcon color="primary" />
        {t('shift.open.title')}
      </VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2} sx={{ pt: 1 }}>
          <VxTypography variant="body2" color="text.secondary">
            {cashierName} — {t('shift.open.hint')}
          </VxTypography>
          <VxAlert id="shift-open-consequence" severity="info">{t('shift.open.consequence')}</VxAlert>
          <VxTextField
            autoFocus
            label={t('shift.open.float')}
            type="number"
            value={floatValue}
            onChange={(e) => { setFloatValue(e.target.value); setInputError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            slotProps={{
              htmlInput: { min: 0, step: 0.01 },
              input: { startAdornment: <VxInputAdornment position="start">{currencyCode}</VxInputAdornment> },
            }}
            error={inputError !== null}
            helperText={inputError ?? ' '}
            fullWidth
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton variant="contained" onClick={handleSubmit} sx={{ minHeight: 44, minWidth: 128 }}>
          {t('shift.open.submit')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
