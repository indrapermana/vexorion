import { VxAlert, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTypography } from '@vexorion/ui'
import { useEffect, useState } from 'react'
import { useI18n } from '../app/I18nContext'
import { useAuth } from '../app/AuthContext'

const WARNING_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
const CHECK_INTERVAL_MS = 30_000 // 30 seconds

export function SessionTimeoutWarning() {
  const { t } = useI18n()
  const { session, isAuthenticated, logout, extendSession } = useAuth()
  const [open, setOpen] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(3)
  const [isExtending, setIsExtending] = useState(false)

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

  const keepSession = async () => {
    setIsExtending(true)
    const extended = await extendSession()
    setIsExtending(false)
    if (extended) setOpen(false)
  }

  return (
    <VxDialog open={open} maxWidth="xs" fullWidth>
      <VxDialogTitle>{t('session.expiringSoon')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={1.5}>
          <VxTypography>
            {t('session.expiresIn').replace('{minutes}', String(minutesLeft))}
          </VxTypography>
          <VxAlert severity="warning">{t('session.transactionWarning')}</VxAlert>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <VxButton color="error" disabled={isExtending} onClick={() => { setOpen(false); void logout() }} sx={{ minHeight: 44 }}>
          {t('session.signOut')}
        </VxButton>
        <VxButton variant="contained" disabled={isExtending} onClick={() => void keepSession()} sx={{ minHeight: 44 }} startIcon={isExtending ? <VxCircularProgress size={16} /> : null}>
          {isExtending ? t('session.extending') : t('session.extend')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
