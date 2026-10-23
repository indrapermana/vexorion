import { AdminPanelSettingsRoundedIcon, DarkModeRoundedIcon, LightModeRoundedIcon, LockRoundedIcon, LogoutRoundedIcon, PointOfSaleRoundedIcon, UndoRoundedIcon } from '@vexorion/ui'
import { VxButton, VxChip, VxIconButton, VxMenuItem, VxPaper, VxStack, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
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
}

export function PosHeader({ canManageRoles, currencyCode, isShiftOpen, canCloseShift, shiftOpenedAt, onCloseShift, canRefund, onOpenReturn }: PosHeaderProps) {
  const { themeMode, toggleThemeMode } = useThemeMode()
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
          {canRefund ? (
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
          <VxButton variant="outlined" startIcon={<LogoutRoundedIcon />} href="/login">
            {t('header.switchUser')}
          </VxButton>
        </VxStack>
      </VxStack>
    </VxPaper>
  )
}
