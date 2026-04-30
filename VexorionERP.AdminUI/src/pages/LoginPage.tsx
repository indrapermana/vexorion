import { Box, Button, Card, Container, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [tenantCode, setTenantCode] = useState('demo')
  const [userNameOrEmail, setUserNameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login({ tenantCode, userNameOrEmail, password })
      navigate('/')
    } catch (err) {
      setError('Invalid credentials')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {t('login.title')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('login.description')}
              </Typography>
            </Box>

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t('login.tenantCode')}
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label={t('login.emailOrUsername')}
                  value={userNameOrEmail}
                  onChange={(e) => setUserNameOrEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label={t('login.password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                />
                <Button variant="contained" type="submit" fullWidth disabled={isLoading}>
                  {isLoading ? t('login.signingIn') : t('login.signInButton')}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Container>
    </Box>
  )
}
