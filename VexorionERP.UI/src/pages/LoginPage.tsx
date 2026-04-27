import { useState } from 'react'
import { Alert, Box, Button, Divider, Link, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../app/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, error, validation, clearFeedback } = useAuth()
  const [form, setForm] = useState({
    tenantCode: 'demo',
    userNameOrEmail: 'admin@demo.local',
    password: 'DemoAdmin123!',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    clearFeedback()

    try {
      await login(form)
      navigate('/')
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error(error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--login">
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>{t('pages.auth.login.title')}</Typography>
        <Typography color="text.secondary">
          {t('pages.auth.login.description')}
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label={t('pages.auth.login.tenantCode')}
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={validation?.TenantCode?.[0] ?? t('pages.auth.login.tenantCodeHelp')}
      />
      <TextField
        label={t('pages.auth.login.usernameOrEmail')}
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={validation?.UserNameOrEmail?.[0]}
      />
      <TextField
        type="password"
        label={t('pages.auth.login.password')}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        error={Boolean(validation?.Password)}
        helperText={validation?.Password?.[0]}
      />

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('pages.auth.login.signingIn') : t('pages.auth.login.signInButton')}
      </Button>

      <Divider>{t('pages.auth.or')}</Divider>

      <Typography variant="body2" color="text.secondary">
        {t('pages.auth.login.needWorkspace')}{' '}
        <Link component={RouterLink} to="/tenants" underline="hover">
          {t('pages.auth.login.createTenantLink')}
        </Link>
      </Typography>
    </Stack>
  )
}