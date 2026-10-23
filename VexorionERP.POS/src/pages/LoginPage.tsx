import { PointOfSaleRoundedIcon, ReceiptLongRoundedIcon, ShieldMoonRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxPaper, VxPasswordField, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, reportClientDiagnostic } from '../lib/api'
import { consumeSessionExpired } from '../lib/sessionNotice'
import { useAuth } from '../app/AuthContext'
import { useI18n } from '../app/I18nContext'

const touchInput = { sx: { minHeight: 56 } }

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { login, error, validation, clearFeedback } = useAuth()
  const [form, setForm] = useState({
    tenantCode: '',
    userNameOrEmail: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionExpired] = useState(consumeSessionExpired)

  const getValidationMessage = (key: string) => {
    const value = validation?.[key]
    if (!value) return undefined
    return Array.isArray(value) ? value[0] : value
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    setIsSubmitting(true)

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
    <VxBox sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
      <VxPaper
        elevation={3}
        sx={{ width: '100%', maxWidth: 480, p: { xs: 3, sm: 4 }, borderRadius: 3 }}
      >
        <VxStack component="form" spacing={2.5} onSubmit={onSubmit}>
          <VxStack spacing={1}>
            <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <VxBox sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <PointOfSaleRoundedIcon />
              </VxBox>
              <VxBox>
                <VxTypography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em', lineHeight: 1.2 }}>
                  {t('login.brand')}
                </VxTypography>
                <VxTypography component="h1" variant="h5">{t('login.title')}</VxTypography>
              </VxBox>
            </VxStack>
            <VxTypography color="text.secondary">{t('login.description')}</VxTypography>
          </VxStack>

          <VxStack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
            <VxStack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <ReceiptLongRoundedIcon fontSize="small" />
              <VxTypography variant="body2">{t('login.contextShift')}</VxTypography>
            </VxStack>
            <VxStack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <ShieldMoonRoundedIcon fontSize="small" />
              <VxTypography variant="body2">{t('login.contextSecure')}</VxTypography>
            </VxStack>
          </VxStack>

          {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}
          {!error && sessionExpired ? <VxAlert severity="info" role="status">{t('login.sessionExpired')}</VxAlert> : null}

          <VxTextField
            label={t('login.tenantCode')}
            name="tenantCode"
            autoComplete="organization"
            autoFocus
            value={form.tenantCode}
            onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
            error={Boolean(validation?.TenantCode)}
            helperText={getValidationMessage('TenantCode') ?? t('login.tenantCodeHelp')}
            slotProps={{ input: touchInput, htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
          />
          <VxTextField
            label={t('login.usernameOrEmail')}
            name="userNameOrEmail"
            autoComplete="username"
            value={form.userNameOrEmail}
            onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
            error={Boolean(validation?.UserNameOrEmail)}
            helperText={getValidationMessage('UserNameOrEmail')}
            slotProps={{ input: touchInput, htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
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
            slotProps={{ input: touchInput }}
          />

          <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ minHeight: 56 }}>
            {isSubmitting ? t('login.signingIn') : t('login.signIn')}
          </VxButton>
        </VxStack>
      </VxPaper>
    </VxBox>
  )
}
