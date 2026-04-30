import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material'
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useTranslation } from 'react-i18next'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { i18n } = useTranslation()

  const handleLogout = async () => {
    await logout()
  }

  const handleLanguageChange = (lang: string) => {
    void i18n.changeLanguage(lang)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Vexorion Admin
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2">{user?.displayName}</Typography>
            <Button size="small" onClick={() => handleLanguageChange('enUS')} color="inherit">
              EN
            </Button>
            <Button size="small" onClick={() => handleLanguageChange('esES')} color="inherit">
              ES
            </Button>
            <Button size="small" onClick={() => handleLanguageChange('idID')} color="inherit">
              ID
            </Button>
            <Button size="small" color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<Typography>Loading...</Typography>}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  )
}
