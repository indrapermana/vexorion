import { useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxLink, VxPasswordField, VxStack, VxTypography, isPasswordPolicyMet } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, completePasswordReset, reportClientDiagnostic, validatePasswordResetToken } from '../lib/api'
import { resolveResetLocale } from '../lib/resetLocale'

type TokenState = 'checking' | 'valid' | 'invalid'

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [tokenState, setTokenState] = useState<TokenState>(token ? 'checking' : 'invalid')
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<Record<string, string[]> | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    validatePasswordResetToken(token)
      .then(() => active && setTokenState('valid'))
      .catch((caught) => {
        if (!active) return
        if (!(caught instanceof ApiError) || caught.status === 0 || caught.status >= 500) {
          reportClientDiagnostic('operation.failed', caught)
        }
        setTokenState('invalid')
      })
    return () => {
      active = false
    }
  }, [token])

  const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword
  const tooShort = form.newPassword.length > 0 && !isPasswordPolicyMet(form.newPassword)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setValidation(null)
    if (mismatch || tooShort || !form.newPassword) return

    setIsSubmitting(true)
    try {
      await completePasswordReset({ token, ...form, locale: resolveResetLocale(i18n?.language) })
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'auth.reset_token_invalid') {
        setTokenState('invalid')
      } else if (caught instanceof ApiError && caught.validation) {
        setValidation(caught.validation)
      } else {
        if (!(caught instanceof ApiError)) {
          reportClientDiagnostic('operation.failed', caught)
        }
        setError(t('pages.auth.resetPassword.failed'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (tokenState === 'checking') {
    return (
      <VxStack spacing={2.5} className="public-form-card public-form-card--login">
        <VxTypography role="status" color="text.secondary">{t('pages.auth.resetPassword.checking')}</VxTypography>
      </VxStack>
    )
  }

  if (tokenState === 'invalid') {
    return (
      <VxStack spacing={2.5} className="public-form-card public-form-card--login">
        <VxTypography component="h1" variant="h4">{t('pages.auth.resetPassword.invalidTitle')}</VxTypography>
        <VxAlert severity="warning" role="alert">{t('pages.auth.resetPassword.invalidMessage')}</VxAlert>
        <VxButton component={RouterLink} to="/forgot-password" variant="contained" size="large">
          {t('pages.auth.resetPassword.requestNew')}
        </VxButton>
        <VxLink component={RouterLink} to="/login" underline="hover">{t('pages.auth.forgotPassword.backToSignIn')}</VxLink>
      </VxStack>
    )
  }

  const passwordLabels = {
    showPasswordLabel: t('pages.auth.login.showPassword'),
    hidePasswordLabel: t('pages.auth.login.hidePassword'),
    capsLockMessage: t('pages.auth.login.capsLockOn'),
  }

  return (
    <VxStack component="form" spacing={2.5} onSubmit={onSubmit} className="public-form-card public-form-card--login">
      <VxBox>
        <VxTypography component="h1" variant="h4" sx={{ mb: 1 }}>{t('pages.auth.resetPassword.title')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.auth.resetPassword.description')}</VxTypography>
      </VxBox>

      {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}

      <VxPasswordField
        {...passwordLabels}
        label={t('pages.auth.resetPassword.newPassword')}
        name="newPassword"
        autoComplete="new-password"
        autoFocus
        value={form.newPassword}
        onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
        error={tooShort || Boolean(validation?.NewPassword)}
        helperText={tooShort ? t('pages.auth.login.passwordPolicy') : validation?.NewPassword?.[0] ?? t('pages.auth.login.passwordPolicy')}
      />
      <VxPasswordField
        {...passwordLabels}
        label={t('pages.auth.resetPassword.confirmPassword')}
        name="confirmPassword"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
        error={mismatch || Boolean(validation?.ConfirmPassword)}
        helperText={mismatch ? t('pages.auth.resetPassword.mismatch') : validation?.ConfirmPassword?.[0]}
      />

      <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting || mismatch || tooShort || !form.newPassword}>
        {isSubmitting ? t('pages.auth.resetPassword.submitting') : t('pages.auth.resetPassword.submit')}
      </VxButton>
    </VxStack>
  )
}
