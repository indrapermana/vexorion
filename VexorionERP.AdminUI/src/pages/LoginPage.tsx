import { VxAlert, VxBox, VxButton, VxDivider, VxPasswordField, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ApiError, reportClientDiagnostic } from '../lib/api'
import { consumeSessionExpired } from '../lib/sessionNotice'
import { useAuth } from '../app/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, error, validation, clearFeedback } = useAuth()
  const [form, setForm] = useState({
    tenantCode: '',
    userNameOrEmail: '',
    password: '',
  })
  const [sessionExpired] = useState(consumeSessionExpired)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getValidationMessage = (key: string) => {
    const value = validation?.[key]
    if (!value) return undefined
    return Array.isArray(value) ? value[0] : value
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    clearFeedback()

    try {
      await login(form)
      navigate('/')
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        reportClientDiagnostic('operation.failed', requestError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VxStack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--login">
      <VxBox>
        <VxTypography component="h1" variant="h4" sx={{ mb: 1 }}>{t('login.title')}</VxTypography>
        <VxTypography color="text.secondary">{t('login.description')}</VxTypography>
      </VxBox>

      {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}
      {!error && sessionExpired ? <VxAlert severity="info" role="status">{t('login.sessionExpired')}</VxAlert> : null}

      <VxTextField
        label={t('login.tenantCode')}
        name="tenantCode"
        autoComplete="organization"
        autoFocus
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={getValidationMessage('TenantCode')}
      />
      <VxTextField
        label={t('login.emailOrUsername')}
        name="userNameOrEmail"
        autoComplete="username"
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={getValidationMessage('UserNameOrEmail')}
      />
      <VxPasswordField
        label={t('login.password')}
        name="password"
        autoComplete="current-password"
        showPasswordLabel={t('login.showPassword')}
        hidePasswordLabel={t('login.hidePassword')}
        capsLockMessage={t('login.capsLockOn')}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        error={Boolean(validation?.Password)}
        helperText={getValidationMessage('Password')}
      />

      <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('login.signingIn') : t('login.signInButton')}
      </VxButton>

      <VxDivider>{t('login.systemAdminOnly')}</VxDivider>
      <VxTypography variant="body2" color="text.secondary">
        {t('login.helpHint')}
      </VxTypography>
    </VxStack>
  )
}
