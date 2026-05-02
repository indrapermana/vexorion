import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded'
import { Button, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useThemeMode } from '../../app/ThemeModeContext'
import { useI18n } from '../../app/I18nContext'
import type { Locale } from '../../app/i18n/types'

type PosHeaderProps = {
  canManageRoles: boolean
}

export function PosHeader({ canManageRoles }: PosHeaderProps) {
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
