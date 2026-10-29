import { AdminPanelSettingsRoundedIcon, DarkModeRoundedIcon, HistoryRoundedIcon, KeyboardArrowDownRoundedIcon, KeyboardArrowUpRoundedIcon, LightModeRoundedIcon, LockRoundedIcon, LogoutRoundedIcon, PointOfSaleRoundedIcon, SwapHorizRoundedIcon, UndoRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxCollapse, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxMenuItem, VxPaper, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
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
  isHistoryOpen: boolean
  onToggleHistory: () => void
  onSignOut: () => void | Promise<void>
}

export function PosHeader({ canManageRoles, currencyCode, isShiftOpen, canCloseShift, shiftOpenedAt, onCloseShift, canRefund, onOpenReturn, isHistoryOpen, onToggleHistory, onSignOut }: PosHeaderProps) {
  const { themeMode, toggleThemeMode } = useThemeMode()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [areSecondaryActionsOpen, setAreSecondaryActionsOpen] = useState(false)
  const requestSignOut = () => {
    if (isShiftOpen) {
      setIsConfirmOpen(true)
      return
    }
    void onSignOut()
  }
  const { locale, setLocale, t } = useI18n()
  const themeButtonLabel = `${t('header.theme')}: ${themeMode === 'dark' ? t('common.light') : t('common.dark')}`
  const secondaryActionsLabel = areSecondaryActionsOpen ? t('header.hideActions') : t('header.moreActions')

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
          <VxButton
            variant="outlined"
            endIcon={areSecondaryActionsOpen ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
            aria-expanded={areSecondaryActionsOpen}
            aria-controls="pos-register-actions"
            onClick={() => setAreSecondaryActionsOpen((current) => !current)}
          >
            {secondaryActionsLabel}
          </VxButton>
        </VxStack>
      </VxStack>

      <VxCollapse in={areSecondaryActionsOpen} timeout="auto">
        <VxBox id="pos-register-actions" sx={{ pt: 2 }}>
          <VxDivider sx={{ mb: 1.5 }} />
          <VxStack spacing={0.25} sx={{ mb: 1.5 }}>
            <VxTypography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('header.secondaryActions')}</VxTypography>
            <VxTypography variant="body2" color="text.secondary">{t('header.secondaryHint')}</VxTypography>
          </VxStack>
          <VxBox
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <VxStack spacing={1}>
              <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {t('header.shiftActions')}
              </VxTypography>
              {isShiftOpen && canCloseShift ? (
                <VxButton variant="outlined" color="warning" startIcon={<LockRoundedIcon />} onClick={onCloseShift}>
                  {t('shift.close.button')}
                </VxButton>
              ) : !isShiftOpen ? (
                <VxTypography variant="body2" color="text.secondary">{t('shift.noShift')}</VxTypography>
              ) : null}
            </VxStack>

            <VxStack spacing={1}>
              <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {t('header.transactionActions')}
              </VxTypography>
              <VxButton variant={isHistoryOpen ? 'contained' : 'outlined'} startIcon={<HistoryRoundedIcon />} onClick={onToggleHistory}>
                {t('header.history')}
              </VxButton>
              {canRefund && isShiftOpen ? (
                <VxButton variant="outlined" color="primary" startIcon={<UndoRoundedIcon />} onClick={onOpenReturn}>
                  {t('return.button')}
                </VxButton>
              ) : null}
            </VxStack>

            <VxStack spacing={1}>
              <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {t('header.settingsActions')}
              </VxTypography>
              <VxTextField
                select
                size="small"
                label={t('header.language')}
                value={locale}
                onChange={(event) => {
                  const nextLocale: Locale = event.target.value === 'id' || event.target.value === 'es' ? event.target.value : 'en'
                  setLocale(nextLocale)
                }}
                fullWidth
              >
                <VxMenuItem value="en">EN</VxMenuItem>
                <VxMenuItem value="id">ID</VxMenuItem>
                <VxMenuItem value="es">ES</VxMenuItem>
              </VxTextField>
              <VxButton
                variant="outlined"
                startIcon={themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
                onClick={toggleThemeMode}
                aria-label={themeButtonLabel}
              >
                {themeButtonLabel}
              </VxButton>
              {canManageRoles ? (
                <VxButton variant="outlined" startIcon={<AdminPanelSettingsRoundedIcon />} component={Link} to="/admin">
                  {t('header.posUsers')}
                </VxButton>
              ) : null}
            </VxStack>

            <VxStack spacing={1}>
              <VxTypography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {t('header.sessionActions')}
              </VxTypography>
              <VxButton variant="outlined" startIcon={<SwapHorizRoundedIcon />} onClick={requestSignOut}>
                {t('header.switchUser')}
              </VxButton>
              <VxButton variant="outlined" color="error" startIcon={<LogoutRoundedIcon />} onClick={requestSignOut}>
                {t('header.signOut')}
              </VxButton>
            </VxStack>
          </VxBox>
        </VxBox>
      </VxCollapse>
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
