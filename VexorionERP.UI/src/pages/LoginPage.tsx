import { useState } from 'react'
import { VxAlert, VxBox, VxButton, VxLink, VxPasswordField, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, reportClientDiagnostic } from '../lib/api'
import { consumeSessionExpired } from '../lib/sessionNotice'
import { useAuth } from '../app/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const passwordChanged = Boolean((useLocation().state as { passwordChanged?: boolean } | null)?.passwordChanged)
  const { login, error, validation, clearFeedback } = useAuth()
  const [form, setForm] = useState({
    tenantCode: '',
    userNameOrEmail: '',
    password: '',
  })
  const [sessionExpired] = useState(consumeSessionExpired)
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
        reportClientDiagnostic('operation.failed', error)
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

      {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}
      {!error && passwordChanged ? <VxAlert severity="success" role="status">{t('pages.auth.login.passwordChanged')}</VxAlert> : null}
      {!error && !passwordChanged && sessionExpired ? <VxAlert severity="info" role="status">{t('pages.auth.login.sessionExpired')}</VxAlert> : null}

      <VxTextField
        label={t('pages.auth.login.tenantCode')}
        name="tenantCode"
        autoComplete="organization"
        autoFocus
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={validation?.TenantCode?.[0] ?? t('pages.auth.login.tenantCodeHelp')}
      />
      <VxTextField
        label={t('pages.auth.login.usernameOrEmail')}
        name="userNameOrEmail"
        autoComplete="username"
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={validation?.UserNameOrEmail?.[0]}
      />
      <VxPasswordField
        label={t('pages.auth.login.password')}
        name="password"
        autoComplete="current-password"
        showPasswordLabel={t('pages.auth.login.showPassword')}
        hidePasswordLabel={t('pages.auth.login.hidePassword')}
        capsLockMessage={t('pages.auth.login.capsLockOn')}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        error={Boolean(validation?.Password)}
        helperText={validation?.Password?.[0]}
      />

      <VxStack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <VxLink component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
          {t('pages.auth.login.forgotPasswordLink')}
        </VxLink>
      </VxStack>

      <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('pages.auth.login.signingIn') : t('pages.auth.login.signInButton')}
      </VxButton>
    </VxStack>
  )
}