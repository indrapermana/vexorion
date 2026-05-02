import { useState } from 'react'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
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
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockOpenRoundedIcon color="primary" />
        {t('shift.open.title')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {cashierName} — {t('shift.open.hint')}
          </Typography>
          <TextField
            autoFocus
            label={t('shift.open.float')}
            type="number"
            value={floatValue}
            onChange={(e) => { setFloatValue(e.target.value); setInputError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            slotProps={{
              htmlInput: { min: 0, step: 0.01 },
              input: { startAdornment: <InputAdornment position="start">{currencyCode}</InputAdornment> },
            }}
            error={inputError !== null}
            helperText={inputError ?? ' '}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleSubmit}>
          {t('shift.open.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
