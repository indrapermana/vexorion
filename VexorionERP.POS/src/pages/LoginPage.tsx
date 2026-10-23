import { PointOfSaleRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxPaper, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../app/AuthContext'
import { useI18n } from '../app/I18nContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { login, error, validation, clearFeedback } = useAuth()
  const [form, setForm] = useState({
    tenantCode: 'demo',
    userNameOrEmail: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        console.error(requestError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VxBox sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <VxPaper elevation={2} sx={{ width: '100%', maxWidth: 420, p: 3 }}>
        <VxStack component="form" spacing={2} onSubmit={onSubmit}>
          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PointOfSaleRoundedIcon color="primary" />
            <VxTypography component="h1" variant="h5">{t('login.title')}</VxTypography>
          </VxStack>

          {error ? <VxAlert severity="error" role="alert">{error}</VxAlert> : null}

          <VxTextField
            label={t('login.tenantCode')}
            value={form.tenantCode}
            onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
            error={Boolean(validation?.TenantCode)}
            helperText={getValidationMessage('TenantCode')}
          />
          <VxTextField
            label={t('login.usernameOrEmail')}
            value={form.userNameOrEmail}
            onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
            error={Boolean(validation?.UserNameOrEmail)}
            helperText={getValidationMessage('UserNameOrEmail')}
          />
          <VxTextField
            type="password"
            label={t('login.password')}
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            error={Boolean(validation?.Password)}
            helperText={getValidationMessage('Password')}
          />

          <VxButton type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? t('login.signingIn') : t('login.signIn')}
          </VxButton>
        </VxStack>
      </VxPaper>
    </VxBox>
  )
}
