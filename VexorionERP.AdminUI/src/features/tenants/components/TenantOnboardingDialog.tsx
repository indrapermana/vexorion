import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      setError(error instanceof Error ? error.message : t('components.tenants.onboarding.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <VxDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <VxDialogTitle>{t('components.tenants.onboarding.title')}</VxDialogTitle>
      <VxDialogContent>
        <VxStack component="form" id="onboard-form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          {error && <VxAlert severity="error">{error}</VxAlert>}

          <VxTypography variant="subtitle2" color="text.secondary">
            {t('components.tenants.onboarding.tenantSection')}
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label={t('components.tenants.onboarding.tenantName')}
              value={form.tenantName}
              onChange={(e) => setField('tenantName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label={t('components.tenants.onboarding.tenantCode')}
              value={form.tenantCode}
              onChange={(e) => setField('tenantCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'lowercase' } } }}
            />
          </VxStack>
          <VxTextField
            label={t('components.tenants.onboarding.domain')}
            value={form.domain}
            onChange={(e) => setField('domain', e.target.value)}
            fullWidth
          />

          <VxDivider />
          <VxTypography variant="subtitle2" color="text.secondary">
            {t('components.tenants.onboarding.companySection')}
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label={t('components.tenants.onboarding.companyName')}
              value={form.companyName}
              onChange={(e) => setField('companyName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label={t('components.tenants.onboarding.companyCode')}
              value={form.companyCode}
              onChange={(e) => setField('companyCode', e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          </VxStack>

          <VxDivider />
          <VxTypography variant="subtitle2" color="text.secondary">
            {t('components.tenants.onboarding.adminSection')}
          </VxTypography>
          <VxStack direction="row" spacing={2}>
            <VxTextField
              label={t('components.tenants.onboarding.firstName')}
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
              fullWidth
            />
            <VxTextField
              label={t('components.tenants.onboarding.lastName')}
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
              fullWidth
            />
          </VxStack>
          <VxTextField
            label={t('components.tenants.onboarding.username')}
            value={form.adminUserName}
            onChange={(e) => setField('adminUserName', e.target.value)}
            required
            fullWidth
          />
          <VxTextField
            label={t('components.tenants.onboarding.email')}
            type="email"
            value={form.adminEmail}
            onChange={(e) => setField('adminEmail', e.target.value)}
            required
            fullWidth
          />
          <VxTextField
            label={t('components.tenants.onboarding.password')}
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
          {t('common.cancel')}
        </VxButton>
        <VxButton type="submit" form="onboard-form" variant="contained" disabled={isSaving}>
          {isSaving ? t('components.tenants.onboarding.creating') : t('components.tenants.onboarding.create')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
