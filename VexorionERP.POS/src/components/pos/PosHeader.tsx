import { AdminPanelSettingsRoundedIcon, DarkModeRoundedIcon, LightModeRoundedIcon, LockRoundedIcon, LogoutRoundedIcon, PointOfSaleRoundedIcon, UndoRoundedIcon } from '@vexorion/ui'
import { Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
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

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PointOfSaleRoundedIcon color="primary" />
          <Typography variant="h5">{t('header.title')}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip label={t('header.currency', { code: currencyCode })} color="primary" variant="outlined" />
          <Chip
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
            <Button variant="outlined" color="warning" startIcon={<LockRoundedIcon />} onClick={onCloseShift}>
              {t('shift.close.button')}
            </Button>
          ) : null}
          {canRefund ? (
            <Button variant="outlined" color="secondary" startIcon={<UndoRoundedIcon />} onClick={onOpenReturn}>
              {t('return.button')}
            </Button>
          ) : null}
          <TextField
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
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="id">ID</MenuItem>
            <MenuItem value="es">ES</MenuItem>
          </TextField>
          <Tooltip title={`${t('header.theme')}: ${themeMode === 'dark' ? t('common.dark') : t('common.light')}`}>
            <IconButton onClick={toggleThemeMode} color="primary">
              {themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </IconButton>
          </Tooltip>
          {canManageRoles ? (
            <Button variant="outlined" startIcon={<AdminPanelSettingsRoundedIcon />} component={Link} to="/admin">
              {t('header.posUsers')}
            </Button>
          ) : null}
          <Button variant="outlined" startIcon={<LogoutRoundedIcon />} href="/login">
            {t('header.switchUser')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
