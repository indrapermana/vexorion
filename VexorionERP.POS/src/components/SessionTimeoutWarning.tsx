import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxTypography } from '@vexorion/ui'
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
    <VxDialog open={open} maxWidth="xs" fullWidth>
      <VxDialogTitle>{t('session.expiringSoon')}</VxDialogTitle>
      <VxDialogContent>
        <VxTypography>
          {t('session.expiresIn').replace('{minutes}', String(minutesLeft))}
        </VxTypography>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton color="error" onClick={() => { setOpen(false); void logout() }}>
          {t('session.signOut')}
        </VxButton>
        <VxButton variant="contained" onClick={() => setOpen(false)}>
          {t('session.extend')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
