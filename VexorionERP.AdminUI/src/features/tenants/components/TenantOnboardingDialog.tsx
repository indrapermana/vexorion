import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to create tenant.'
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
    } catch (error: unknown) {
      setError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <VxDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <VxDialogTitle>New Tenant</VxDialogTitle>
      <VxDialogContent>
        <VxStack component="form" id="onboard-form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          {error && <VxAlert severity="error">{error}</VxAlert>}

          <VxTypography variant="subtitle2" color="text.secondary">
            Tenant
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label="Tenant Name"
              value={form.tenantName}
              onChange={(e) => setField('tenantName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label="Tenant Code"
              value={form.tenantCode}
              onChange={(e) => setField('tenantCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'lowercase' } } }}
            />
          </VxStack>
          <VxTextField
            label="Domain (optional)"
            value={form.domain}
            onChange={(e) => setField('domain', e.target.value)}
            fullWidth
          />

          <VxDivider />
          <VxTypography variant="subtitle2" color="text.secondary">
            Company
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label="Company Name"
              value={form.companyName}
              onChange={(e) => setField('companyName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label="Company Code"
              value={form.companyCode}
              onChange={(e) => setField('companyCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          </VxStack>

          <VxDivider />
          <VxTypography variant="subtitle2" color="text.secondary">
            Admin User
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label="First Name"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
              fullWidth
            />
          </VxStack>
          <VxTextField
            label="Username"
            value={form.adminUserName}
            onChange={(e) => setField('adminUserName', e.target.value)}
            required
            fullWidth
          />
          <VxTextField
            label="Email"
            type="email"
            value={form.adminEmail}
            onChange={(e) => setField('adminEmail', e.target.value)}
            required
            fullWidth
          />
          <VxTextField
            label="Password"
            type="password"
            value={form.adminPassword}
            onChange={(e) => setField('adminPassword', e.target.value)}
            required
            fullWidth
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={handleClose} disabled={isSaving}>
          Cancel
        </VxButton>
        <VxButton type="submit" form="onboard-form" variant="contained" disabled={isSaving}>
          {isSaving ? 'Creating...' : 'Create Tenant'}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
