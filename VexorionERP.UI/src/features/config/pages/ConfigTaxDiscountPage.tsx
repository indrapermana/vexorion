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
        setError('Unable to load tax and discount configuration.')
      }
    }
  }, [isAuthenticated])

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
        setFeedback('Tax code updated.')
      } else {
        await createTaxCode(payload)
        setFeedback('Tax code created.')
      }

      clearTaxDraft()
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to save tax code.')
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
      setFeedback('Tax code deleted.')
      if (editTargetId === taxCodeId) {
        clearTaxDraft()
      }

      await loadData()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete tax code.')
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
      setFeedback('Discount configuration saved.')
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to save discount configuration.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Tax and discount configuration requires authentication.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>Tax and Discount Configuration</Typography>
        <Typography color="text.secondary">
          Manage tax code definitions and baseline discount rules.
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 2 }}>{editTargetId ? 'Edit tax code' : 'New tax code'}</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField size="small" label="Code" value={draft.code} onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))} />
          <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
          <TextField
            size="small"
            label="Rate %"
            type="number"
            value={draft.ratePercent}
            onChange={(event) => setDraft((prev) => ({ ...prev, ratePercent: event.target.value }))}
            sx={{ width: 140 }}
          />
          <FormControlLabel
            control={<Switch checked={draft.isInclusive} onChange={(event) => setDraft((prev) => ({ ...prev, isInclusive: event.target.checked }))} />}
            label="Inclusive"
          />
          <Button variant="contained" onClick={() => void submitTaxCode()} disabled={isSaving}>Save</Button>
          {editTargetId ? <Button variant="outlined" onClick={clearTaxDraft}>Cancel edit</Button> : null}
        </Stack>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1.5 }}>Tax codes</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Rate %</TableCell>
              <TableCell>Inclusive</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxCodes.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.ratePercent}</TableCell>
                <TableCell>{item.isInclusive ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button size="small" variant="outlined" onClick={() => startEdit(item)}>Edit</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => void removeTaxCode(item.id)}>
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 2 }}>Discount policy defaults</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            type="number"
            label="Default discount %"
            value={discountConfig.defaultDiscountPercent}
            onChange={(event) => setDiscountConfig((prev) => ({ ...prev, defaultDiscountPercent: Number(event.target.value) }))}
            sx={{ width: 200 }}
          />
          <TextField
            size="small"
            type="number"
            label="Max manual discount %"
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
            label="Allow negative discount"
          />
          <Button variant="contained" onClick={() => void saveDiscounts()} disabled={isSaving}>Save discount config</Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
