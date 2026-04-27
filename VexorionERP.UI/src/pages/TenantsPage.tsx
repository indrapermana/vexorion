import { useState } from 'react'
import { Alert, Box, Button, Divider, Grid, Link, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { ApiError, onboardTenant } from '../lib/api'
import type { OnboardTenantRequest, OnboardTenantResponse, ValidationProblem } from '../types/api'

const initialForm: OnboardTenantRequest = {
  tenantName: 'Northwind Fabrication',
  tenantCode: 'northwind',
  domain: 'northwind.local',
  companyName: 'Northwind Fabrication Ltd',
  companyCode: 'NWF',
  adminUserName: 'owner',
  adminEmail: 'owner@northwind.local',
  adminPassword: 'OwnerStart123!',
  firstName: 'Nadia',
  lastName: 'Wong',
}

export default function TenantsPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState<OnboardTenantResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationProblem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = (field: keyof OnboardTenantRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setResult(null)
    setError(null)
    setValidation(null)

    try {
      const response = await onboardTenant(form)
      setResult(response)
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
        setValidation(error.validation ?? null)
      } else {
        setError('Tenant onboarding failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--tenant">
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>{t('pages.auth.tenants.title')}</Typography>
        <Typography color="text.secondary">
          {t('pages.auth.tenants.description')}
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {result ? (
        <Alert severity="success">
          {t('pages.auth.tenants.success', { tenantCode: result.tenantCode, adminUserName: result.adminUserName })}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Tenant name" value={form.tenantName} onChange={(event) => setField('tenantName', event.target.value)} error={Boolean(validation?.TenantName)} helperText={validation?.TenantName?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Tenant code" value={form.tenantCode} onChange={(event) => setField('tenantCode', event.target.value)} error={Boolean(validation?.TenantCode)} helperText={validation?.TenantCode?.[0] ?? 'Lowercase slug used during sign-in.'} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Domain" value={form.domain ?? ''} onChange={(event) => setField('domain', event.target.value)} error={Boolean(validation?.Domain)} helperText={validation?.Domain?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Company name" value={form.companyName} onChange={(event) => setField('companyName', event.target.value)} error={Boolean(validation?.CompanyName)} helperText={validation?.CompanyName?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Company code" value={form.companyCode} onChange={(event) => setField('companyCode', event.target.value)} error={Boolean(validation?.CompanyCode)} helperText={validation?.CompanyCode?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Admin user name" value={form.adminUserName} onChange={(event) => setField('adminUserName', event.target.value)} error={Boolean(validation?.AdminUserName)} helperText={validation?.AdminUserName?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Admin email" value={form.adminEmail} onChange={(event) => setField('adminEmail', event.target.value)} error={Boolean(validation?.AdminEmail)} helperText={validation?.AdminEmail?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth type="password" label="Admin password" value={form.adminPassword} onChange={(event) => setField('adminPassword', event.target.value)} error={Boolean(validation?.AdminPassword)} helperText={validation?.AdminPassword?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="First name" value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} error={Boolean(validation?.FirstName)} helperText={validation?.FirstName?.[0]} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Last name" value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} error={Boolean(validation?.LastName)} helperText={validation?.LastName?.[0]} />
        </Grid>
      </Grid>

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('pages.auth.tenants.creating') : t('pages.auth.tenants.createButton')}
      </Button>

      <Divider />

      <Typography variant="body2" color="text.secondary">
        {t('pages.auth.tenants.alreadyHaveWorkspace')}{' '}
        <Link component={RouterLink} to="/login" underline="hover">
          {t('pages.auth.tenants.signInInstead')}
        </Link>
      </Typography>
    </Stack>
  )
}