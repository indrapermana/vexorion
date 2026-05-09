import { useMemo, useState } from 'react'
import { LockRoundedIcon } from '@vexorion/ui'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useI18n } from '../../app/I18nContext'
import { useTransactionHistory } from '../../app/transactionHistoryStore'
import type { Shift } from '../../app/shiftStore'

type Props = {
  open: boolean
  shift: Shift
  currencyCode: string
  onClose: () => void
  onConfirm: (countedCash: number) => void
}

function SummaryRow({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', pl: indent ? 2 : 0 }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 600 : 400, color: indent ? 'text.secondary' : 'inherit' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 600 : 400 }}>
        {value}
      </Typography>
    </Stack>
  )
}

export function ShiftCloseDialog({ open, shift, currencyCode, onClose, onConfirm }: Props) {
  const { t } = useI18n()
  const transactions = useTransactionHistory((state) => state.transactions)
  const [countedRaw, setCountedRaw] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(n)

  const shiftTx = useMemo(
    () => transactions.filter((tx) => tx.shiftId === shift.id),
    [transactions, shift.id],
  )

  const totalSales = useMemo(() => shiftTx.reduce((s, tx) => s + tx.grandTotal, 0), [shiftTx])
  const cashSales = useMemo(
    () => shiftTx.filter((tx) => tx.paymentMethod === 'Cash').reduce((s, tx) => s + tx.grandTotal, 0),
    [shiftTx],
  )
  const cardSales = useMemo(
    () => shiftTx.filter((tx) => tx.paymentMethod === 'Card').reduce((s, tx) => s + tx.grandTotal, 0),
    [shiftTx],
  )
  const transferSales = useMemo(
    () => shiftTx.filter((tx) => tx.paymentMethod === 'Transfer').reduce((s, tx) => s + tx.grandTotal, 0),
    [shiftTx],
  )
  const totalDiscounts = useMemo(
    () =>
      shiftTx.reduce(
        (s, tx) => s + (tx.lines?.reduce((ls, l) => ls + l.discountAmount, 0) ?? 0),
        0,
      ),
    [shiftTx],
  )

  const expectedCash = shift.openingFloat + cashSales
  const countedCash = parseFloat(countedRaw)
  const variance = Number.isFinite(countedCash) ? countedCash - expectedCash : null

  const openedAtFormatted = new Date(shift.openedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleConfirm = () => {
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      setInputError('Enter a valid counted cash amount.')
      return
    }
    setInputError(null)
    setCountedRaw('')
    onConfirm(countedCash)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockRoundedIcon color="warning" />
        {t('shift.close.title')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Shift meta */}
          <Stack direction="row" spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {t('shift.summary.openedAt')}: <strong>{openedAtFormatted}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('shift.summary.cashier')}: <strong>{shift.openedByName}</strong>
            </Typography>
          </Stack>

          <Divider />

          {/* Sales breakdown — Item 7 */}
          <Typography variant="subtitle2">{t('shift.summary.title')}</Typography>
          <Stack spacing={0.5}>
            <SummaryRow label={t('shift.summary.totalSales')} value={fmt(totalSales)} bold />
            <SummaryRow label={t('shift.summary.cashSales')} value={fmt(cashSales)} indent />
            <SummaryRow label={t('shift.summary.cardSales')} value={fmt(cardSales)} indent />
            <SummaryRow label={t('shift.summary.transferSales')} value={fmt(transferSales)} indent />
            <SummaryRow label={t('shift.summary.discounts')} value={`-${fmt(totalDiscounts)}`} />
          </Stack>

          <Divider />

          {/* Cash reconciliation — Item 8 */}
          <Typography variant="subtitle2">{t('shift.summary.cashReconcile')}</Typography>
          <Stack spacing={0.5}>
            <SummaryRow label={t('shift.summary.openingFloat')} value={fmt(shift.openingFloat)} />
            <SummaryRow label={t('shift.summary.cashSales')} value={fmt(cashSales)} indent />
            <SummaryRow label={t('shift.summary.expectedCash')} value={fmt(expectedCash)} bold />
          </Stack>

          <TextField
            autoFocus
            label={t('shift.close.counted')}
            type="number"
            value={countedRaw}
            onChange={(e) => { setCountedRaw(e.target.value); setInputError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            slotProps={{
              htmlInput: { min: 0, step: 0.01 },
              input: { startAdornment: <InputAdornment position="start">{currencyCode}</InputAdornment> },
            }}
            error={inputError !== null}
            helperText={inputError ?? ' '}
            fullWidth
          />

          {/* Live variance chip */}
          {variance !== null ? (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{t('shift.summary.variance')}</Typography>
              <Chip
                size="small"
                label={
                  variance === 0
                    ? fmt(0)
                    : `${variance > 0 ? t('shift.summary.over') : t('shift.summary.short')} ${fmt(Math.abs(variance))}`
                }
                color={variance === 0 ? 'success' : variance > 0 ? 'info' : 'error'}
              />
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" color="warning" onClick={handleConfirm}>
          {t('shift.close.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
