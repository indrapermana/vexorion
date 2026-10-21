import { DarkModeRoundedIcon, DashboardRoundedIcon, GroupsRoundedIcon, LightModeRoundedIcon, LogoutRoundedIcon, MenuRoundedIcon, SettingsApplicationsRoundedIcon, StoreRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxDivider, VxDrawer, VxIconButton, VxList, VxListItemButton, VxListItemIcon, VxListItemText, VxMenuItem, VxPaper, VxSelect, VxStack, VxToolbar, VxTooltip, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useThemeMode } from '../app/ThemeModeContext'
import { canAccessAdminRoute } from '../app/authorization'

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
  const visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => canAccessAdminRoute(user?.permissions, link.to)),
    }))
    .filter((section) => section.links.length > 0)

  const sidebar = (collapsed: boolean) => (
    <VxBox className={collapsed ? 'dashboard-sidebar-shell dashboard-sidebar-shell-collapsed' : 'dashboard-sidebar-shell'}>
      <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1.25 : 2.5, py: 2.5 }}>
        <VxBox className="brand-mark">
          <VxBox component="img" src="/favicon.svg" alt="Vexorion" sx={{ width: 28, height: 28 }} />
        </VxBox>
        {!collapsed ? (
          <VxBox sx={{ minWidth: 0, flex: 1 }}>
            <VxTypography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
              VEXORION ERP
            </VxTypography>
          </VxBox>
        ) : null}
      </VxStack>

      <VxDivider />

      <VxBox sx={{ px: collapsed ? 1 : 1.5, py: 1.5 }}>
        {!collapsed ? <VxTypography className="sidebar-caption">Navigation</VxTypography> : null}
        <VxStack spacing={1.5}>
          {visibleNavigationSections.map((section) => (
            <VxBox key={section.title}>
              {!collapsed ? (
                <VxTypography variant="overline" sx={{ px: 1.5, color: 'text.secondary', letterSpacing: '0.12em' }}>
                  {section.title}
                </VxTypography>
              ) : null}
              <VxList disablePadding>
                {section.links.map((link) => {
                  const navItem = (
                    <VxListItemButton
                      key={link.to}
                      component={NavLink}
                      to={link.to}
                      selected={location.pathname === link.to}
                      onClick={() => setMobileOpen(false)}
                      className={location.pathname === link.to ? 'dashboard-nav-item dashboard-nav-item-active nav-accent-overview' : 'dashboard-nav-item nav-accent-overview'}
                      sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1.25 : 2 }}
                    >
                      <VxListItemIcon className={collapsed ? 'dashboard-nav-icon-slot dashboard-nav-icon-slot-collapsed' : 'dashboard-nav-icon-slot'} sx={{ justifyContent: 'center' }}>
                        {link.icon}
                      </VxListItemIcon>
                      {!collapsed ? <VxListItemText primary={link.label} /> : null}
                    </VxListItemButton>
                  )

                  if (!collapsed) {
                    return navItem
                  }

                  return (
                    <VxTooltip key={link.to} title={link.label} placement="right" arrow>
                      {navItem}
                    </VxTooltip>
                  )
                })}
              </VxList>
            </VxBox>
          ))}
        </VxStack>
      </VxBox>

      <VxBox sx={{ mt: 'auto', px: collapsed ? 1 : 2, pb: 2 }}>
        <VxPaper elevation={0} className="sidebar-footer-card">
          {!collapsed ? (
            <>
              <VxTypography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {isAuthenticated && user ? user.displayName : 'Anonymous'}
              </VxTypography>
              <VxTypography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {isAuthenticated && user ? user.email : 'Sign in required'}
              </VxTypography>
            </>
          ) : null}
          {isAuthenticated ? (
            collapsed ? (
              <VxIconButton color="primary" onClick={() => void handleLogout()} aria-label="Logout" sx={{ width: '100%' }}>
                <LogoutRoundedIcon />
              </VxIconButton>
            ) : (
              <VxButton fullWidth variant="contained" startIcon={<LogoutRoundedIcon />} onClick={() => void handleLogout()}>
                Logout
              </VxButton>
            )
          ) : (
            collapsed ? <VxChip size="small" label="P" variant="outlined" /> : <VxChip label="Public access only" variant="outlined" />
          )}
        </VxPaper>
      </VxBox>
    </VxBox>
  )

  return (
    <VxBox className="dashboard-shell">
      <VxDrawer
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
      </VxDrawer>

      <VxDrawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { width: desktopDrawerWidth, boxSizing: 'border-box', border: 'none', transition: 'width 180ms ease' },
        }}
      >
        {sidebar(isSidebarCollapsed)}
      </VxDrawer>

      <VxBox className="dashboard-main" sx={{ ml: { lg: `${desktopDrawerWidth}px` }, transition: 'margin-left 180ms ease' }}>
        <VxToolbar className="dashboard-topbar" sx={{ position: 'relative' }}>
          <VxStack direction="row" spacing={1} sx={{ position: 'absolute', top: 8, right: 16 }}>
            <VxSelect
              size="small"
              value={themeMode}
              onChange={(event) => setThemeMode(event.target.value as 'light' | 'dark')}
              aria-label="Theme"
              sx={{ minWidth: 120, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <VxMenuItem value="light">
                <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <LightModeRoundedIcon fontSize="small" />
                  <span>Light</span>
                </VxStack>
              </VxMenuItem>
              <VxMenuItem value="dark">
                <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <DarkModeRoundedIcon fontSize="small" />
                  <span>Dark</span>
                </VxStack>
              </VxMenuItem>
            </VxSelect>
            <VxIconButton size="small" onClick={toggleThemeMode} aria-label="Toggle theme" sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
              {themeMode === 'light' ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
            </VxIconButton>
            <VxSelect
              size="small"
              value={currentLanguage}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value)
              }}
              aria-label="Language"
              sx={{ minWidth: 152 }}
            >
              {languageOptions.map((option) => (
                <VxMenuItem key={option.code} value={option.code}>{option.label}</VxMenuItem>
              ))}
            </VxSelect>
            {isAuthenticated ? (
              <VxChip color="secondary" label={user ? `${user.displayName} · ${user.roles[0] ?? 'User'}` : 'Signed in'} />
            ) : (
              <VxChip label="Public route" variant="outlined" />
            )}
          </VxStack>
          <VxStack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <VxIconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </VxIconButton>
            <VxIconButton sx={{ display: { xs: 'none', lg: 'inline-flex' } }} onClick={toggleSidebarCollapsed} aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <MenuRoundedIcon />
            </VxIconButton>
            <VxBox sx={{ mr: 'auto', minWidth: 0 }}>
              <VxTypography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                ADMIN CONSOLE
              </VxTypography>
              <VxTypography variant="h5" noWrap>{pageTitle}</VxTypography>
            </VxBox>
          </VxStack>
        </VxToolbar>

        <VxBox className="dashboard-content">
          <Outlet />
        </VxBox>
      </VxBox>
    </VxBox>
  )
}
