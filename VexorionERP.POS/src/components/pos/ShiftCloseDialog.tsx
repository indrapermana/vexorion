import { useEffect, useState } from 'react'
import { LockRoundedIcon, VxAlert, VxButton, VxChip, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxInputAdornment, VxMenuItem, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'
import { addShiftCashMovementApi, getShiftReconciliationApi } from '../../lib/api/pos'
import type { Shift } from '../../app/shiftStore'
import type { PosShiftReconciliationResponse } from '../../types/api'

type Props = { open: boolean; shift: Shift; currencyCode: string; onClose: () => void; onConfirm: (countedCash: number, varianceReason?: string) => void }

function SummaryRow({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) {
  return <VxStack direction="row" sx={{ justifyContent: 'space-between', pl: indent ? 2 : 0 }}>
    <VxTypography variant="body2" sx={{ fontWeight: bold ? 600 : 400, color: indent ? 'text.secondary' : 'inherit' }}>{label}</VxTypography>
    <VxTypography variant="body2" sx={{ fontWeight: bold ? 600 : 400 }}>{value}</VxTypography>
  </VxStack>
}

export function ShiftCloseDialog({ open, shift, currencyCode, onClose, onConfirm }: Props) {
  const { t } = useI18n()
  const [summary, setSummary] = useState<PosShiftReconciliationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countedRaw, setCountedRaw] = useState('')
  const [varianceReason, setVarianceReason] = useState('')
  const [movementType, setMovementType] = useState<1 | 2>(1)
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [savingMovement, setSavingMovement] = useState(false)

  const loadSummary = async () => {
    setError(null)
    try { setSummary(await getShiftReconciliationApi(shift.id)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : t('shift.close.loadError')) }
  }
  useEffect(() => { if (open) void loadSummary() }, [open, shift.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(amount)
  const countedCash = Number(countedRaw)
  const variance = summary && countedRaw !== '' && Number.isFinite(countedCash) ? countedCash - summary.expectedCash : null
  const openedAt = new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const addMovement = async () => {
    const amount = Number(movementAmount)
    if (!Number.isFinite(amount) || amount <= 0 || !movementReason.trim()) { setError(t('shift.movement.invalid')); return }
    setSavingMovement(true); setError(null)
    try {
      await addShiftCashMovementApi(shift.id, { type: movementType, amount, reason: movementReason.trim() })
      setMovementAmount(''); setMovementReason(''); await loadSummary()
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('shift.movement.saveError')) }
    finally { setSavingMovement(false) }
  }

  const confirm = () => {
    if (!summary) { setError(t('shift.close.loadError')); return }
    if (countedRaw === '' || !Number.isFinite(countedCash) || countedCash < 0) { setError(t('shift.close.invalidAmount')); return }
    if (variance !== 0 && !varianceReason.trim()) { setError(t('shift.close.varianceReasonRequired')); return }
    onConfirm(countedCash, varianceReason.trim() || undefined)
  }

  return <VxDialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper" aria-describedby="shift-close-consequence">
    <VxDialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LockRoundedIcon color="warning" />{t('shift.close.title')}</VxDialogTitle>
    <VxDialogContent dividers><VxStack spacing={2} sx={{ pt: 1 }}>
      <VxAlert id="shift-close-consequence" severity="warning">{t('shift.close.consequence')}</VxAlert>
      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }}>
        <VxTypography variant="body2" color="text.secondary">{t('shift.summary.openedAt')}: <strong>{openedAt}</strong></VxTypography>
        <VxTypography variant="body2" color="text.secondary">{t('shift.summary.cashier')}: <strong>{shift.openedByName}</strong></VxTypography>
      </VxStack>
      <VxDivider />
      <VxTypography component="h3" variant="subtitle2">{t('shift.movement.title')}</VxTypography>
      <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <VxTextField select label={t('shift.movement.type')} value={movementType} onChange={(event) => setMovementType(Number(event.target.value) as 1 | 2)} sx={{ minWidth: 140 }}>
          <VxMenuItem value={1}>{t('shift.movement.cashIn')}</VxMenuItem><VxMenuItem value={2}>{t('shift.movement.cashOut')}</VxMenuItem>
        </VxTextField>
        <VxTextField label={t('shift.movement.amount')} type="number" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
      </VxStack>
      <VxTextField label={t('shift.movement.reason')} value={movementReason} onChange={(event) => setMovementReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
      <VxButton variant="outlined" disabled={savingMovement} onClick={() => void addMovement()}>{t('shift.movement.add')}</VxButton>
      <VxDivider />
      <VxTypography component="h3" variant="subtitle2">{t('shift.summary.title')}</VxTypography>
      <VxAlert severity="info">{t('shift.close.serverAuthoritative')}</VxAlert>
      {summary ? <VxStack spacing={0.5}>
        <SummaryRow label={t('shift.summary.cashSales')} value={fmt(summary.cashSales)} />
        <SummaryRow label={t('shift.summary.cashRefunds')} value={`-${fmt(summary.cashRefunds)}`} />
        <SummaryRow label={t('shift.summary.cardSales')} value={fmt(summary.cardSales)} />
        <SummaryRow label={t('shift.summary.transferSales')} value={fmt(summary.transferSales)} />
      </VxStack> : <VxTypography color="text.secondary">{t('shift.close.loading')}</VxTypography>}
      <VxDivider />
      <VxTypography component="h3" variant="subtitle2">{t('shift.summary.cashReconcile')}</VxTypography>
      {summary ? <VxStack spacing={0.5}>
        <SummaryRow label={t('shift.summary.openingFloat')} value={fmt(summary.openingFloat)} />
        <SummaryRow label={t('shift.summary.cashSales')} value={fmt(summary.cashSales)} indent />
        <SummaryRow label={t('shift.summary.cashRefunds')} value={`-${fmt(summary.cashRefunds)}`} indent />
        <SummaryRow label={t('shift.summary.cashIn')} value={fmt(summary.cashIn)} indent />
        <SummaryRow label={t('shift.summary.cashOut')} value={`-${fmt(summary.cashOut)}`} indent />
        <SummaryRow label={t('shift.summary.expectedCash')} value={fmt(summary.expectedCash)} bold />
      </VxStack> : null}
      <VxTextField autoFocus label={t('shift.close.counted')} type="number" value={countedRaw} onChange={(event) => { setCountedRaw(event.target.value); setError(null) }}
        slotProps={{ htmlInput: { min: 0, step: 0.01 }, input: { startAdornment: <VxInputAdornment position="start">{currencyCode}</VxInputAdornment> } }} fullWidth />
      {variance !== null && variance !== 0 ? <VxTextField required label={t('shift.close.varianceReason')} value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} /> : null}
      {variance !== null ? <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><VxTypography variant="body2">{t('shift.summary.variance')}</VxTypography>
        <VxChip size="small" label={variance === 0 ? fmt(0) : `${variance > 0 ? t('shift.summary.over') : t('shift.summary.short')} ${fmt(Math.abs(variance))}`} color={variance === 0 ? 'success' : variance > 0 ? 'info' : 'error'} />
      </VxStack> : null}
    </VxStack></VxDialogContent>
    <VxDialogActions sx={{ px: 3, py: 2, gap: 1 }}><VxButton onClick={onClose}>{t('common.cancel')}</VxButton><VxButton variant="contained" color="warning" disabled={!summary} onClick={confirm}>{t('shift.close.submit')}</VxButton></VxDialogActions>
  </VxDialog>
}
