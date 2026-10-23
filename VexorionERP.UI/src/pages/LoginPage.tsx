import { useState } from 'react'
import { VxAlert, VxBox, VxButton, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
    <VxStack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--login">
      <VxBox>
        <VxTypography component="h1" variant="h4" sx={{ mb: 1 }}>{t('pages.auth.login.title')}</VxTypography>
        <VxTypography color="text.secondary">
          {t('pages.auth.login.description')}
        </VxTypography>
      </VxBox>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}

      <VxTextField
        label={t('pages.auth.login.tenantCode')}
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={validation?.TenantCode?.[0] ?? t('pages.auth.login.tenantCodeHelp')}
      />
      <VxTextField
        label={t('pages.auth.login.usernameOrEmail')}
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={validation?.UserNameOrEmail?.[0]}
      />
      <VxTextField
        type="password"
        label={t('pages.auth.login.password')}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        error={Boolean(validation?.Password)}
        helperText={validation?.Password?.[0]}
      />

      <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('pages.auth.login.signingIn') : t('pages.auth.login.signInButton')}
      </VxButton>
    </VxStack>
  )
}