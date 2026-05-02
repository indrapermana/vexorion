import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper elevation={2} sx={{ width: '100%', maxWidth: 420, p: 3 }}>
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PointOfSaleRoundedIcon color="primary" />
            <Typography variant="h5">{t('login.title')}</Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label={t('login.tenantCode')}
            value={form.tenantCode}
            onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
            error={Boolean(validation?.TenantCode)}
            helperText={getValidationMessage('TenantCode')}
          />
          <TextField
            label={t('login.usernameOrEmail')}
            value={form.userNameOrEmail}
            onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
            error={Boolean(validation?.UserNameOrEmail)}
            helperText={getValidationMessage('UserNameOrEmail')}
          />
          <TextField
            type="password"
            label={t('login.password')}
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            error={Boolean(validation?.Password)}
            helperText={getValidationMessage('Password')}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? t('login.signingIn') : t('login.signIn')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
