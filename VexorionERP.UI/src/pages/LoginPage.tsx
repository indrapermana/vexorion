import { useState } from 'react'
import { Alert, Box, Button, Divider, Link, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../app/AuthContext'

export default function LoginPage() {
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
        <Typography variant="h4" sx={{ mb: 1 }}>Sign in</Typography>
        <Typography color="text.secondary">
          This page talks to `/api/auth/login` and stores the JWT pair locally for protected routes.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label="Tenant code"
        value={form.tenantCode}
        onChange={(event) => setForm((current) => ({ ...current, tenantCode: event.target.value }))}
        error={Boolean(validation?.TenantCode)}
        helperText={validation?.TenantCode?.[0] ?? 'Use the tenant slug issued during onboarding.'}
      />
      <TextField
        label="Username or email"
        value={form.userNameOrEmail}
        onChange={(event) => setForm((current) => ({ ...current, userNameOrEmail: event.target.value }))}
        error={Boolean(validation?.UserNameOrEmail)}
        helperText={validation?.UserNameOrEmail?.[0]}
      />
      <TextField
        type="password"
        label="Password"
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        error={Boolean(validation?.Password)}
        helperText={validation?.Password?.[0]}
      />

      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>

      <Divider>or</Divider>

      <Typography variant="body2" color="text.secondary">
        Need a workspace first?{' '}
        <Link component={RouterLink} to="/tenants" underline="hover">
          Create a tenant and admin account
        </Link>
      </Typography>
    </Stack>
  )
}