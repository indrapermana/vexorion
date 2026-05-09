import { useState } from 'react'
import { LockOpenRoundedIcon } from '@vexorion/ui'
import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxInputAdornment, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
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
      setInputError('Enter a valid amount (0 or more).')
      return
    }
    setInputError(null)
    setFloatValue('')
    onOpen(parsed)
  }

  return (
    <VxDialog open={open} maxWidth="xs" fullWidth>
      <VxDialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockOpenRoundedIcon color="primary" />
        {t('shift.open.title')}
      </VxDialogTitle>
      <VxDialogContent>
        <VxStack spacing={2} sx={{ pt: 1 }}>
          <VxTypography variant="body2" color="text.secondary">
            {cashierName} — {t('shift.open.hint')}
          </VxTypography>
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
      <VxDialogActions>
        <VxButton variant="contained" onClick={handleSubmit}>
          {t('shift.open.submit')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
