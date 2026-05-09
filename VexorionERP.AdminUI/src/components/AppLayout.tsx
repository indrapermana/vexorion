import { DarkModeRoundedIcon, DashboardRoundedIcon, GroupsRoundedIcon, LightModeRoundedIcon, LogoutRoundedIcon, MenuRoundedIcon, SettingsApplicationsRoundedIcon, StoreRoundedIcon } from '@vexorion/ui'
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useThemeMode } from '../app/ThemeModeContext'

const drawerWidth = 280
const collapsedDrawerWidth = 92
const sidebarCollapsedStorageKey = 'vexorion.admin.sidebarCollapsed'

const languageOptions = [
  { code: 'enUS', label: 'English' },
  { code: 'esES', label: 'Español' },
  { code: 'idID', label: 'Bahasa Indonesia' },
] as const

const navigationSections = [
  {
    title: 'Overview',
    links: [{ to: '/', label: 'Dashboard', icon: <DashboardRoundedIcon /> }],
  },
  {
    title: 'Administration',
    links: [
      { to: '/tenants', label: 'Tenants', icon: <StoreRoundedIcon /> },
      { to: '/users', label: 'Users', icon: <GroupsRoundedIcon /> },
      { to: '/menu-configuration', label: 'Menu Configuration', icon: <SettingsApplicationsRoundedIcon /> },
    ],
  },
] as const

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tenants': 'Tenants',
  '/users': 'Users',
  '/menu-configuration': 'Menu Configuration',
}

export default function AppLayout() {
  const location = useLocation()
  const { i18n } = useTranslation()
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === 'true')

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current
      localStorage.setItem(sidebarCollapsedStorageKey, String(next))
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
  }

  const pageTitle = routeTitles[location.pathname] ?? 'System Admin'
  const currentLanguage = i18n.language
  const desktopDrawerWidth = isSidebarCollapsed ? collapsedDrawerWidth : drawerWidth

  const sidebar = (collapsed: boolean) => (
    <Box className={collapsed ? 'dashboard-sidebar-shell dashboard-sidebar-shell-collapsed' : 'dashboard-sidebar-shell'}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1.25 : 2.5, py: 2.5 }}>
        <Box className="brand-mark">
          <Box component="img" src="/favicon.svg" alt="Vexorion" sx={{ width: 28, height: 28 }} />
        </Box>
        {!collapsed ? (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
              VEXORION ERP
            </Typography>
          </Box>
        ) : null}
      </Stack>

      <Divider />

      <Box sx={{ px: collapsed ? 1 : 1.5, py: 1.5 }}>
        {!collapsed ? <Typography className="sidebar-caption">Navigation</Typography> : null}
        <Stack spacing={1.5}>
          {navigationSections.map((section) => (
            <Box key={section.title}>
              {!collapsed ? (
                <Typography variant="overline" sx={{ px: 1.5, color: 'text.secondary', letterSpacing: '0.12em' }}>
                  {section.title}
                </Typography>
              ) : null}
              <List disablePadding>
                {section.links.map((link) => {
                  const navItem = (
                    <ListItemButton
                      key={link.to}
                      component={NavLink}
                      to={link.to}
                      selected={location.pathname === link.to}
                      onClick={() => setMobileOpen(false)}
                      className={location.pathname === link.to ? 'dashboard-nav-item dashboard-nav-item-active nav-accent-overview' : 'dashboard-nav-item nav-accent-overview'}
                      sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1.25 : 2 }}
                    >
                      <ListItemIcon className={collapsed ? 'dashboard-nav-icon-slot dashboard-nav-icon-slot-collapsed' : 'dashboard-nav-icon-slot'} sx={{ justifyContent: 'center' }}>
                        {link.icon}
                      </ListItemIcon>
                      {!collapsed ? <ListItemText primary={link.label} /> : null}
                    </ListItemButton>
                  )

                  if (!collapsed) {
                    return navItem
                  }

                  return (
                    <Tooltip key={link.to} title={link.label} placement="right" arrow>
                      {navItem}
                    </Tooltip>
                  )
                })}
              </List>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 'auto', px: collapsed ? 1 : 2, pb: 2 }}>
        <Paper elevation={0} className="sidebar-footer-card">
          {!collapsed ? (
            <>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {isAuthenticated && user ? user.displayName : 'Anonymous'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {isAuthenticated && user ? user.email : 'Sign in required'}
              </Typography>
            </>
          ) : null}
          {isAuthenticated ? (
            collapsed ? (
              <IconButton color="primary" onClick={() => void handleLogout()} aria-label="Logout" sx={{ width: '100%' }}>
                <LogoutRoundedIcon />
              </IconButton>
            ) : (
              <Button fullWidth variant="contained" startIcon={<LogoutRoundedIcon />} onClick={() => void handleLogout()}>
                Logout
              </Button>
            )
          ) : (
            collapsed ? <Chip size="small" label="P" variant="outlined" /> : <Chip label="Public access only" variant="outlined" />
          )}
        </Paper>
      </Box>
    </Box>
  )

  return (
    <Box className="dashboard-shell">
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {sidebar(false)}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { width: desktopDrawerWidth, boxSizing: 'border-box', border: 'none', transition: 'width 180ms ease' },
        }}
      >
        {sidebar(isSidebarCollapsed)}
      </Drawer>

      <Box className="dashboard-main" sx={{ ml: { lg: `${desktopDrawerWidth}px` }, transition: 'margin-left 180ms ease' }}>
        <Toolbar className="dashboard-topbar" sx={{ position: 'relative' }}>
          <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 8, right: 16 }}>
            <Select
              size="small"
              value={themeMode}
              onChange={(event) => setThemeMode(event.target.value as 'light' | 'dark')}
              aria-label="Theme"
              sx={{ minWidth: 120, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <MenuItem value="light">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <LightModeRoundedIcon fontSize="small" />
                  <span>Light</span>
                </Stack>
              </MenuItem>
              <MenuItem value="dark">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <DarkModeRoundedIcon fontSize="small" />
                  <span>Dark</span>
                </Stack>
              </MenuItem>
            </Select>
            <IconButton size="small" onClick={toggleThemeMode} aria-label="Toggle theme" sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
              {themeMode === 'light' ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
            </IconButton>
            <Select
              size="small"
              value={currentLanguage}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value)
              }}
              aria-label="Language"
              sx={{ minWidth: 152 }}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
              ))}
            </Select>
            {isAuthenticated ? (
              <Chip color="secondary" label={user ? `${user.displayName} · ${user.roles[0] ?? 'User'}` : 'Signed in'} />
            ) : (
              <Chip label="Public route" variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <IconButton sx={{ display: { xs: 'none', lg: 'inline-flex' } }} onClick={toggleSidebarCollapsed} aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ mr: 'auto', minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                ADMIN CONSOLE
              </Typography>
              <Typography variant="h5" noWrap>{pageTitle}</Typography>
            </Box>
          </Stack>
        </Toolbar>

        <Box className="dashboard-content">
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
