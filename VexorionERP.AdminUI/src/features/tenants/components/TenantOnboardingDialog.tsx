import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { onboardTenant } from '../../../lib/api'
import type { OnboardTenantRequest, OnboardTenantResponse, TenantListItemResponse } from '../../../types/api'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (tenant: TenantListItemResponse) => void
}

const emptyForm: OnboardTenantRequest = {
  tenantName: '',
  tenantCode: '',
  domain: '',
  companyName: '',
  companyCode: '',
  adminUserName: '',
  adminEmail: '',
  adminPassword: '',
  firstName: '',
  lastName: '',
}

export function TenantOnboardingDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<OnboardTenantRequest>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const setField = (field: keyof OnboardTenantRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    setForm(emptyForm)
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const result: OnboardTenantResponse = await onboardTenant(form)
      // Build a minimal TenantListItemResponse to add to the list
      const newTenant: TenantListItemResponse = {
        id: result.tenantId,
        name: form.tenantName,
        code: result.tenantCode,
        domain: form.domain || null,
        isActive: true,
        createdAtUtc: new Date().toISOString(),
      }
      onCreated(newTenant)
      handleClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create tenant.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Tenant</DialogTitle>
      <DialogContent>
        <Stack component="form" id="onboard-form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="subtitle2" color="text.secondary">
            Tenant
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Tenant Name"
              value={form.tenantName}
              onChange={(e) => setField('tenantName', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Tenant Code"
              value={form.tenantCode}
              onChange={(e) => setField('tenantCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'lowercase' } } }}
            />
          </Stack>
          <TextField
            label="Domain (optional)"
            value={form.domain}
            onChange={(e) => setField('domain', e.target.value)}
            fullWidth
          />

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">
            Company
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Company Name"
              value={form.companyName}
              onChange={(e) => setField('companyName', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Company Code"
              value={form.companyCode}
              onChange={(e) => setField('companyCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          </Stack>

          <Divider />
          <Typography variant="subtitle2" color="text.secondary">
            Admin User
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
              fullWidth
            />
          </Stack>
          <TextField
            label="Username"
            value={form.adminUserName}
            onChange={(e) => setField('adminUserName', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={form.adminEmail}
            onChange={(e) => setField('adminEmail', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={form.adminPassword}
            onChange={(e) => setField('adminPassword', e.target.value)}
            required
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" form="onboard-form" variant="contained" disabled={isSaving}>
          {isSaving ? 'Creating...' : 'Create Tenant'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
