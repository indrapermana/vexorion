import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import {
  ApiError,
  createTaxCode,
  deleteTaxCode,
  getTaxCodes,
  getTenantPreferences,
  updateDiscountConfiguration,
  updateTaxCode,
} from '../../../lib/api'
import type { CreateTaxCodeRequest, TaxCodeListItemResponse } from '../../../types/api'

type TaxCodeDraft = {
  code: string
  name: string
  ratePercent: string
  isInclusive: boolean
}

const emptyTaxCodeDraft: TaxCodeDraft = {
  code: '',
  name: '',
  ratePercent: '0',
  isInclusive: false,
}

export default function ConfigTaxDiscountPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [taxCodes, setTaxCodes] = useState<TaxCodeListItemResponse[]>([])
  const [draft, setDraft] = useState<TaxCodeDraft>(emptyTaxCodeDraft)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [discountConfig, setDiscountConfig] = useState({
    defaultDiscountPercent: 0,
    maxManualDiscountPercent: 25,
    allowNegativeDiscount: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setTaxCodes([])
      return
    }

    setError(null)
    try {
      const [codes, preferences] = await Promise.all([getTaxCodes(), getTenantPreferences()])
      setTaxCodes(codes)
      setDiscountConfig({
        defaultDiscountPercent: preferences.defaultDiscountPercent,
        maxManualDiscountPercent: preferences.maxManualDiscountPercent,
        allowNegativeDiscount: preferences.allowNegativeDiscount,
      })
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.taxDiscount.errors.load'))
      }
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const clearTaxDraft = () => {
    setDraft(emptyTaxCodeDraft)
    setEditTargetId(null)
  }

  const submitTaxCode = async () => {
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    const payload: CreateTaxCodeRequest = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      ratePercent: Number(draft.ratePercent),
      isInclusive: draft.isInclusive,
    }

    try {
      if (editTargetId) {
        await updateTaxCode(editTargetId, payload)
        setFeedback(t('config.taxDiscount.feedback.taxUpdated'))
      } else {
        await createTaxCode(payload)
        setFeedback(t('config.taxDiscount.feedback.taxCreated'))
      }

      clearTaxDraft()
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.taxDiscount.errors.saveTax'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (taxCode: TaxCodeListItemResponse) => {
    setEditTargetId(taxCode.id)
    setDraft({
      code: taxCode.code,
      name: taxCode.name,
      ratePercent: String(taxCode.ratePercent),
      isInclusive: taxCode.isInclusive,
    })
  }

  const removeTaxCode = async (taxCodeId: string) => {
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      await deleteTaxCode(taxCodeId)
      setFeedback(t('config.taxDiscount.feedback.taxDeleted'))
      if (editTargetId === taxCodeId) {
        clearTaxDraft()
      }

      await loadData()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError(t('config.taxDiscount.errors.deleteTax'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const saveDiscounts = async () => {
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateDiscountConfiguration({
        defaultDiscountPercent: Number(discountConfig.defaultDiscountPercent),
        maxManualDiscountPercent: Number(discountConfig.maxManualDiscountPercent),
        allowNegativeDiscount: discountConfig.allowNegativeDiscount,
      })

      setDiscountConfig({
        defaultDiscountPercent: updated.defaultDiscountPercent,
        maxManualDiscountPercent: updated.maxManualDiscountPercent,
        allowNegativeDiscount: updated.allowNegativeDiscount,
      })
      setFeedback(t('config.taxDiscount.feedback.discountSaved'))
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.taxDiscount.errors.saveDiscount'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">{t('config.taxDiscount.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('config.taxDiscount.title')}</Typography>
        <Typography color="text.secondary">
          {t('config.taxDiscount.description')}
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 2 }}>{editTargetId ? t('config.taxDiscount.editTaxCode') : t('config.taxDiscount.newTaxCode')}</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField size="small" label={t('config.taxDiscount.fields.code')} value={draft.code} onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))} />
          <TextField size="small" label={t('config.taxDiscount.fields.name')} value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
          <TextField
            size="small"
            label={t('config.taxDiscount.fields.ratePercent')}
            type="number"
            value={draft.ratePercent}
            onChange={(event) => setDraft((prev) => ({ ...prev, ratePercent: event.target.value }))}
            sx={{ width: 140 }}
          />
          <FormControlLabel
            control={<Switch checked={draft.isInclusive} onChange={(event) => setDraft((prev) => ({ ...prev, isInclusive: event.target.checked }))} />}
            label={t('config.taxDiscount.fields.inclusive')}
          />
          <Button variant="contained" onClick={() => void submitTaxCode()} disabled={isSaving}>{t('config.taxDiscount.saveTaxButton')}</Button>
          {editTargetId ? <Button variant="outlined" onClick={clearTaxDraft}>{t('config.taxDiscount.cancelEdit')}</Button> : null}
        </Stack>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1.5 }}>{t('config.taxDiscount.taxCodesSection')}</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('config.taxDiscount.columns.code')}</TableCell>
              <TableCell>{t('config.taxDiscount.columns.name')}</TableCell>
              <TableCell>{t('config.taxDiscount.columns.ratePercent')}</TableCell>
              <TableCell>{t('config.taxDiscount.columns.inclusive')}</TableCell>
              <TableCell align="right">{t('config.taxDiscount.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxCodes.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.ratePercent}</TableCell>
                <TableCell>{item.isInclusive ? t('common.yes') : t('common.no')}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button size="small" variant="outlined" onClick={() => startEdit(item)}>{t('common.edit')}</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => void removeTaxCode(item.id)}>
                      {t('dialogs.delete')}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 2 }}>{t('config.taxDiscount.discountSection')}</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            type="number"
            label={t('config.taxDiscount.fields.defaultDiscountPercent')}
            value={discountConfig.defaultDiscountPercent}
            onChange={(event) => setDiscountConfig((prev) => ({ ...prev, defaultDiscountPercent: Number(event.target.value) }))}
            sx={{ width: 200 }}
          />
          <TextField
            size="small"
            type="number"
            label={t('config.taxDiscount.fields.maxManualDiscountPercent')}
            value={discountConfig.maxManualDiscountPercent}
            onChange={(event) => setDiscountConfig((prev) => ({ ...prev, maxManualDiscountPercent: Number(event.target.value) }))}
            sx={{ width: 220 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={discountConfig.allowNegativeDiscount}
                onChange={(event) => setDiscountConfig((prev) => ({ ...prev, allowNegativeDiscount: event.target.checked }))}
              />
            }
            label={t('config.taxDiscount.fields.allowNegativeDiscount')}
          />
          <Button variant="contained" onClick={() => void saveDiscounts()} disabled={isSaving}>{t('config.taxDiscount.saveDiscountButton')}</Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
