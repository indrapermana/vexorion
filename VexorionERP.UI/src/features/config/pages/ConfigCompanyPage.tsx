import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getCompanies, getCompany, updateCompany } from '../../../lib/api'
import type { CompanyDetailsResponse, CompanyListItemResponse, UpdateCompanyRequest } from '../../../types/api'

type CompanyDraft = {
  name: string
  code: string
  taxNumber: string
  email: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  isActive: boolean
  currencyCode: string
}

function toDraft(details: CompanyDetailsResponse): CompanyDraft {
  return {
    name: details.name,
    code: details.code,
    taxNumber: details.taxNumber ?? '',
    email: details.email ?? '',
    phoneNumber: details.phoneNumber ?? '',
    addressLine1: details.addressLine1 ?? '',
    addressLine2: details.addressLine2 ?? '',
    city: details.city ?? '',
    state: details.state ?? '',
    postalCode: details.postalCode ?? '',
    country: details.country ?? '',
    isActive: details.isActive,
    currencyCode: details.currencyCode ?? 'USD',
  }
}

export default function ConfigCompanyPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [companies, setCompanies] = useState<CompanyListItemResponse[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [draft, setDraft] = useState<CompanyDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    if (!isAuthenticated) {
      setCompanies([])
      setSelectedCompanyId('')
      setDraft(null)
      return
    }

    setError(null)
    try {
      const list = await getCompanies()
      setCompanies(list)
      if (list.length === 0) {
        setSelectedCompanyId('')
        setDraft(null)
        return
      }

      const nextSelectedCompanyId = selectedCompanyId && list.some((item) => item.id === selectedCompanyId)
        ? selectedCompanyId
        : list[0].id

      setSelectedCompanyId(nextSelectedCompanyId)
      const details = await getCompany(nextSelectedCompanyId)
      setDraft(toDraft(details))
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.company.errors.loadSettings'))
      }
    }
  }, [isAuthenticated, selectedCompanyId, t])

  useEffect(() => {
    void loadCompanies()
  }, [loadCompanies])

  const loadCompany = async (companyId: string) => {
    setError(null)
    setFeedback(null)
    setSelectedCompanyId(companyId)

    try {
      const details = await getCompany(companyId)
      setDraft(toDraft(details))
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.company.errors.loadSelected'))
      }
    }
  }

  const save = async () => {
    if (!draft || !selectedCompanyId) {
      return
    }

    setError(null)
    setFeedback(null)
    setIsSaving(true)

    const payload: UpdateCompanyRequest = {
      name: draft.name.trim(),
      code: draft.code.trim(),
      taxNumber: draft.taxNumber.trim() || null,
      email: draft.email.trim() || null,
      phoneNumber: draft.phoneNumber.trim() || null,
      addressLine1: draft.addressLine1.trim() || null,
      addressLine2: draft.addressLine2.trim() || null,
      city: draft.city.trim() || null,
      state: draft.state.trim() || null,
      postalCode: draft.postalCode.trim() || null,
      country: draft.country.trim() || null,
      isActive: draft.isActive,
      currencyCode: draft.currencyCode,
    }

    try {
      const updated = await updateCompany(selectedCompanyId, payload)
      setDraft(toDraft(updated))
      setFeedback(t('config.company.feedback.updated'))
      await loadCompanies()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.company.errors.save'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">{t('config.company.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('config.company.title')}</Typography>
        <Typography color="text.secondary">
          {t('config.company.description')}
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            label={t('config.company.companyField')}
            value={selectedCompanyId}
            select
            onChange={(event) => void loadCompany(event.target.value)}
            sx={{ minWidth: 260 }}
          >
            {companies.map((company) => (
              <MenuItem key={company.id} value={company.id}>
                {company.code} - {company.name}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={() => void save()} disabled={!draft || isSaving || !selectedCompanyId}>
            {t('config.company.saveButton')}
          </Button>
        </Stack>
      </Paper>

      {draft ? (
        <Paper elevation={0} className="panel-card">
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label={t('config.company.fields.name')} value={draft.name} onChange={(event) => setDraft((prev) => prev ? { ...prev, name: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.code')} value={draft.code} onChange={(event) => setDraft((prev) => prev ? { ...prev, code: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.taxNumber')} value={draft.taxNumber} onChange={(event) => setDraft((prev) => prev ? { ...prev, taxNumber: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label={t('config.company.fields.email')} value={draft.email} onChange={(event) => setDraft((prev) => prev ? { ...prev, email: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.phone')} value={draft.phoneNumber} onChange={(event) => setDraft((prev) => prev ? { ...prev, phoneNumber: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.country')} value={draft.country} onChange={(event) => setDraft((prev) => prev ? { ...prev, country: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label={t('config.company.fields.address1')} value={draft.addressLine1} onChange={(event) => setDraft((prev) => prev ? { ...prev, addressLine1: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.address2')} value={draft.addressLine2} onChange={(event) => setDraft((prev) => prev ? { ...prev, addressLine2: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label={t('config.company.fields.city')} value={draft.city} onChange={(event) => setDraft((prev) => prev ? { ...prev, city: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.state')} value={draft.state} onChange={(event) => setDraft((prev) => prev ? { ...prev, state: event.target.value } : prev)} fullWidth />
              <TextField size="small" label={t('config.company.fields.postalCode')} value={draft.postalCode} onChange={(event) => setDraft((prev) => prev ? { ...prev, postalCode: event.target.value } : prev)} fullWidth />
            </Stack>

            <FormControlLabel
              control={<Switch checked={draft.isActive} onChange={(event) => setDraft((prev) => prev ? { ...prev, isActive: event.target.checked } : prev)} />}
              label={t('config.company.fields.isActive')}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                select
                label={t('config.company.fields.currencyCode')}
                value={draft.currencyCode}
                onChange={(event) => setDraft((prev) => prev ? { ...prev, currencyCode: event.target.value } : prev)}
                sx={{ minWidth: 160 }}
              >
                {['USD', 'SGD', 'MYR', 'IDR', 'AUD'].map((code) => (
                  <MenuItem key={code} value={code}>{code}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Alert severity="info">{t('config.company.noRecords')}</Alert>
      )}
    </Stack>
  )
}
