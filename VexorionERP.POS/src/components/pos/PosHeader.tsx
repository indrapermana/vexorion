import { AdminPanelSettingsRoundedIcon, DarkModeRoundedIcon, LightModeRoundedIcon, LockRoundedIcon, LogoutRoundedIcon, PointOfSaleRoundedIcon, SwapHorizRoundedIcon, UndoRoundedIcon } from '@vexorion/ui'
import { VxButton, VxChip, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxIconButton, VxMenuItem, VxPaper, VxStack, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useThemeMode } from '../../app/ThemeModeContext'
import { useI18n } from '../../app/I18nContext'
import type { Locale } from '../../app/i18n/types'

type PosHeaderProps = {
  canManageRoles: boolean
  currencyCode: string
  isShiftOpen: boolean
  canCloseShift: boolean
  shiftOpenedAt?: string
  onCloseShift: () => void
  canRefund: boolean
  onOpenReturn: () => void
  onSignOut: () => void | Promise<void>
}

export function PosHeader({ canManageRoles, currencyCode, isShiftOpen, canCloseShift, shiftOpenedAt, onCloseShift, canRefund, onOpenReturn, onSignOut }: PosHeaderProps) {
  const { themeMode, toggleThemeMode } = useThemeMode()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const requestSignOut = () => {
    if (isShiftOpen) {
      setIsConfirmOpen(true)
      return
    }
    void onSignOut()
  }
  const { locale, setLocale, t } = useI18n()
  const themeButtonLabel = `${t('header.theme')}: ${themeMode === 'dark' ? t('common.light') : t('common.dark')}`

  return (
    <VxPaper sx={{ p: 2 }}>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PointOfSaleRoundedIcon color="primary" />
          <VxTypography component="h1" variant="h5">{t('header.title')}</VxTypography>
        </VxStack>
        <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
          <VxChip label={t('header.currency', { code: currencyCode })} color="primary" variant="outlined" />
          <VxChip
            label={
              isShiftOpen && shiftOpenedAt
                ? t('shift.status.open', {
                    time: new Date(shiftOpenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  })
                : t('shift.noShift')
            }
            color={isShiftOpen ? 'success' : 'default'}
            variant="outlined"
          />
          {isShiftOpen && canCloseShift ? (
            <VxButton variant="outlined" color="warning" startIcon={<LockRoundedIcon />} onClick={onCloseShift}>
              {t('shift.close.button')}
            </VxButton>
          ) : null}
          {canRefund && isShiftOpen ? (
            <VxButton variant="outlined" color="primary" startIcon={<UndoRoundedIcon />} onClick={onOpenReturn}>
              {t('return.button')}
            </VxButton>
          ) : null}
          <VxTextField
            select
            size="small"
            label={t('header.language')}
            value={locale}
            onChange={(event) => {
              const nextLocale: Locale = event.target.value === 'id' || event.target.value === 'es' ? event.target.value : 'en'
              setLocale(nextLocale)
            }}
            sx={{ minWidth: 110 }}
          >
            <VxMenuItem value="en">EN</VxMenuItem>
            <VxMenuItem value="id">ID</VxMenuItem>
            <VxMenuItem value="es">ES</VxMenuItem>
          </VxTextField>
          <VxTooltip title={themeButtonLabel}>
            <VxIconButton onClick={toggleThemeMode} color="primary" aria-label={themeButtonLabel}>
              {themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </VxIconButton>
          </VxTooltip>
          {canManageRoles ? (
            <VxButton variant="outlined" startIcon={<AdminPanelSettingsRoundedIcon />} component={Link} to="/admin">
              {t('header.posUsers')}
            </VxButton>
          ) : null}
          <VxButton variant="outlined" startIcon={<SwapHorizRoundedIcon />} onClick={requestSignOut}>
            {t('header.switchUser')}
          </VxButton>
          <VxButton variant="outlined" color="error" startIcon={<LogoutRoundedIcon />} onClick={requestSignOut}>
            {t('header.signOut')}
          </VxButton>
        </VxStack>
      </VxStack>
      <VxDialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('header.signOutShiftOpen.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxTypography>{t('header.signOutShiftOpen.body')}</VxTypography>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setIsConfirmOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton color="error" variant="contained" onClick={() => { setIsConfirmOpen(false); void onSignOut() }}>
            {t('header.signOutShiftOpen.confirm')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxPaper>
  )
}
