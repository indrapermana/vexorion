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
  }
}

export default function ConfigCompanyPage() {
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
        setError('Unable to load company settings.')
      }
    }
  }, [isAuthenticated, selectedCompanyId])

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
        setError('Unable to load selected company.')
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
    }

    try {
      const updated = await updateCompany(selectedCompanyId, payload)
      setDraft(toDraft(updated))
      setFeedback('Company profile updated.')
      await loadCompanies()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to save company profile.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Company configuration requires authentication.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>Company Profile</Typography>
        <Typography color="text.secondary">
          Maintain legal and contact data used across operational documents.
        </Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            label="Company"
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
            Save company profile
          </Button>
        </Stack>
      </Paper>

      {draft ? (
        <Paper elevation={0} className="panel-card">
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label="Company name" value={draft.name} onChange={(event) => setDraft((prev) => prev ? { ...prev, name: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Company code" value={draft.code} onChange={(event) => setDraft((prev) => prev ? { ...prev, code: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Tax number" value={draft.taxNumber} onChange={(event) => setDraft((prev) => prev ? { ...prev, taxNumber: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label="Email" value={draft.email} onChange={(event) => setDraft((prev) => prev ? { ...prev, email: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Phone" value={draft.phoneNumber} onChange={(event) => setDraft((prev) => prev ? { ...prev, phoneNumber: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Country" value={draft.country} onChange={(event) => setDraft((prev) => prev ? { ...prev, country: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label="Address line 1" value={draft.addressLine1} onChange={(event) => setDraft((prev) => prev ? { ...prev, addressLine1: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Address line 2" value={draft.addressLine2} onChange={(event) => setDraft((prev) => prev ? { ...prev, addressLine2: event.target.value } : prev)} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField size="small" label="City" value={draft.city} onChange={(event) => setDraft((prev) => prev ? { ...prev, city: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="State" value={draft.state} onChange={(event) => setDraft((prev) => prev ? { ...prev, state: event.target.value } : prev)} fullWidth />
              <TextField size="small" label="Postal code" value={draft.postalCode} onChange={(event) => setDraft((prev) => prev ? { ...prev, postalCode: event.target.value } : prev)} fullWidth />
            </Stack>

            <FormControlLabel
              control={<Switch checked={draft.isActive} onChange={(event) => setDraft((prev) => prev ? { ...prev, isActive: event.target.checked } : prev)} />}
              label="Company active"
            />
          </Stack>
        </Paper>
      ) : (
        <Alert severity="info">No company records found for this tenant yet.</Alert>
      )}
    </Stack>
  )
}
