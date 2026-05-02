import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useI18n } from '../app/I18nContext'
import { useAuth } from '../app/AuthContext'

const WARNING_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
const CHECK_INTERVAL_MS = 30_000 // 30 seconds

export function SessionTimeoutWarning() {
  const { t } = useI18n()
  const { session, isAuthenticated, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(3)

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false)
      return
    }

    const check = () => {
      const expiresAt = session?.expiresAtUtc
      if (!expiresAt) return
      const msLeft = new Date(expiresAt).getTime() - Date.now()
      if (msLeft > 0 && msLeft <= WARNING_THRESHOLD_MS) {
        setMinutesLeft(Math.max(1, Math.ceil(msLeft / 60_000)))
        setOpen(true)
      } else if (msLeft <= 0) {
        setOpen(false)
      }
    }

    check()
    const id = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isAuthenticated, session?.expiresAtUtc])

  if (!isAuthenticated) return null

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>{t('session.expiringSoon')}</DialogTitle>
      <DialogContent>
        <Typography>
          {t('session.expiresIn').replace('{minutes}', String(minutesLeft))}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={() => { setOpen(false); void logout() }}>
          {t('session.signOut')}
        </Button>
        <Button variant="contained" onClick={() => setOpen(false)}>
          {t('session.extend')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
