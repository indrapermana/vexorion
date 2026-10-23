import { useState } from 'react'
import { VxAlert, VxBox, VxButton, VxLink, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { ApiError, reportClientDiagnostic, requestPasswordReset } from '../lib/api'
import { resolveResetLocale } from '../lib/resetLocale'

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({ tenantCode: '', userNameOrEmail: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<Record<string, string[]> | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setValidation(null)

    try {
      await requestPasswordReset({ ...form, locale: resolveResetLocale(i18n?.language) })
      setSent(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.validation) {
        setValidation(caught.validation)
      } else {
        if (!(caught instanceof ApiError)) {
          reportClientDiagnostic('operation.failed', caught)
        }
        setError(t('pages.auth.forgotPassword.failed'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sent) {
    return (
      <VxStack spacing={2.5} className="public-form-card public-form-card--login">
        <VxTypography component="h1" variant="h4">{t('pages.auth.forgotPassword.sentTitle')}</VxTypography>
        <VxAlert severity="success" role="status">{t('pages.auth.forgotPassword.sentMessage')}</VxAlert>
        <VxLink component={RouterLink} to="/login" underline="hover">{t('pages.auth.forgotPassword.backToSignIn')}</VxLink>
      </VxStack>
    )
  }

  return (
    <VxStack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--login">
      <VxBox>
        <VxTypography component="h1" variant="h4" sx={{ mb: 1 }}>{t('pages.auth.forgotPassword.title')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.auth.forgotPassword.description')}</VxTypography>
      </VxBox>

      {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}

      <VxTextField
        label={t('pages.auth.login.tenantCode')}
        name="tenantCode"
        autoComplete="organization"
        autoFocus
        required
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={validation?.TenantCode?.[0]}
      />
      <VxTextField
        label={t('pages.auth.login.usernameOrEmail')}
        name="userNameOrEmail"
        autoComplete="username"
        required
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={validation?.UserNameOrEmail?.[0]}
      />

      <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? t('pages.auth.forgotPassword.submitting') : t('pages.auth.forgotPassword.submit')}
      </VxButton>
      <VxLink component={RouterLink} to="/login" underline="hover">{t('pages.auth.forgotPassword.backToSignIn')}</VxLink>
    </VxStack>
  )
}
