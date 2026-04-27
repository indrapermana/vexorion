import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded'
import SellRoundedIcon from '@mui/icons-material/SellRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import RuleRoundedIcon from '@mui/icons-material/RuleRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { useThemeMode } from '../app/ThemeModeContext'
import {
  type TranslationLanguage,
  LanguageOptions,
  normalizeTranslationLanguage,
} from '../i18n/translationConstant'
import { getTenantPreferences } from '../lib/api'
import { getHiddenMenuLinks, saveHiddenMenuLinks, subscribeToMenuConfigChange } from '../lib/menuConfig'

const drawerWidth = 280
const collapsedDrawerWidth = 92
const sidebarCollapsedStorageKey = 'vexorion.sidebarCollapsed'

function getSectionAccentClass(titleKey: string) {
  if (titleKey === 'nav.sections.overview') return 'nav-accent-overview'
  if (titleKey === 'nav.sections.sales') return 'nav-accent-sales'
  if (titleKey === 'nav.sections.procurement') return 'nav-accent-procurement'
  if (titleKey === 'nav.sections.inventory') return 'nav-accent-inventory'
  if (titleKey === 'nav.sections.finance') return 'nav-accent-finance'
  if (titleKey === 'nav.sections.configuration') return 'nav-accent-configuration'
  return 'nav-accent-default'
}

const navigationSections = [
  {
    titleKey: 'nav.sections.overview',
    links: [
      { to: '/', labelKey: 'nav.links.dashboard', icon: <DashboardRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.sales',
    links: [
      { to: '/customers', labelKey: 'nav.links.customers', icon: <BadgeRoundedIcon /> },
      { to: '/sales-orders', labelKey: 'nav.links.salesOrders', icon: <SellRoundedIcon /> },
      { to: '/sales-shipments', labelKey: 'nav.links.salesShipments', icon: <LocalShippingRoundedIcon /> },
      { to: '/sales-invoices', labelKey: 'nav.links.salesInvoices', icon: <RequestQuoteRoundedIcon /> },
      { to: '/customer-payments', labelKey: 'nav.links.customerPayments', icon: <PaymentsRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.procurement',
    links: [
      { to: '/suppliers', labelKey: 'nav.links.suppliers', icon: <StorefrontRoundedIcon /> },
      { to: '/purchase-orders', labelKey: 'nav.links.purchaseOrders', icon: <ShoppingBagRoundedIcon /> },
      { to: '/purchase-receipts', labelKey: 'nav.links.purchaseReceipts', icon: <InventoryRoundedIcon /> },
      { to: '/purchase-invoices', labelKey: 'nav.links.purchaseInvoices', icon: <ReceiptLongRoundedIcon /> },
      { to: '/vendor-payments', labelKey: 'nav.links.vendorPayments', icon: <AccountBalanceWalletRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.inventory',
    links: [
      { to: '/products', labelKey: 'nav.links.products', icon: <Inventory2RoundedIcon /> },
      { to: '/inventory-adjustments', labelKey: 'nav.links.inventoryAdjustments', icon: <TuneRoundedIcon /> },
      { to: '/stock-counts', labelKey: 'nav.links.stockCounts', icon: <RuleRoundedIcon /> },
      { to: '/stock-transfers', labelKey: 'nav.links.stockTransfers', icon: <SwapHorizRoundedIcon /> },
      { to: '/warehouses', labelKey: 'nav.links.warehouses', icon: <WarehouseRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.finance',
    links: [
      { to: '/accounts', labelKey: 'nav.links.accounts', icon: <AccountBalanceRoundedIcon /> },
      { to: '/audit-logs', labelKey: 'nav.links.auditLogs', icon: <PolicyRoundedIcon /> },
      { to: '/fiscal-periods', labelKey: 'nav.links.fiscalPeriods', icon: <CalendarMonthRoundedIcon /> },
      { to: '/journals', labelKey: 'nav.links.journals', icon: <MenuBookRoundedIcon /> },
      { to: '/reports', labelKey: 'nav.links.reports', icon: <InsightsRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.configuration',
    links: [
      { to: '/config', labelKey: 'nav.links.configCenter', icon: <AdminPanelSettingsRoundedIcon /> },
    ],
  },
] as const

const routeTitleKeys: Record<string, string> = {
  '/': 'nav.routeTitles.overview',
  '/customers': 'nav.routeTitles.customers',
  '/customer-payments': 'nav.routeTitles.customerPayments',
  '/accounts': 'nav.routeTitles.accounts',
  '/audit-logs': 'nav.routeTitles.auditLogs',
  '/config': 'nav.routeTitles.config',
  '/config/company': 'nav.routeTitles.configCompany',
  '/config/menu': 'nav.routeTitles.configMenu',
  '/config/roles': 'nav.routeTitles.configRoles',
  '/config/tax-discount': 'nav.routeTitles.configTaxDiscount',
  '/config/users': 'nav.routeTitles.configUsers',
  '/fiscal-periods': 'nav.routeTitles.fiscalPeriods',
  '/journals': 'nav.routeTitles.journals',
  '/reports': 'nav.routeTitles.reports',
  '/products': 'nav.routeTitles.products',
  '/inventory-adjustments': 'nav.routeTitles.inventoryAdjustments',
  '/purchase-invoices': 'nav.routeTitles.purchaseInvoices',
  '/purchase-orders': 'nav.routeTitles.purchaseOrders',
  '/purchase-receipts': 'nav.routeTitles.purchaseReceipts',
  '/sales-invoices': 'nav.routeTitles.salesInvoices',
  '/sales-orders': 'nav.routeTitles.salesOrders',
  '/sales-shipments': 'nav.routeTitles.salesShipments',
  '/stock-counts': 'nav.routeTitles.stockCounts',
  '/stock-transfers': 'nav.routeTitles.stockTransfers',
  '/suppliers': 'nav.routeTitles.suppliers',
  '/vendor-payments': 'nav.routeTitles.vendorPayments',
  '/warehouses': 'nav.routeTitles.warehouses',
}

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === 'true')
  const [hiddenMenuLinks, setHiddenMenuLinks] = useState<string[]>(() => getHiddenMenuLinks())

  const currentLanguage = normalizeTranslationLanguage(i18n.language)

  const handleLanguageChange = (nextLanguage: TranslationLanguage) => {
    void i18n.changeLanguage(nextLanguage)
  }

  const handleThemeModeChange = (nextMode: 'light' | 'dark') => {
    setThemeMode(nextMode)
  }

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

  useEffect(() => {
    return subscribeToMenuConfigChange(() => {
      setHiddenMenuLinks(getHiddenMenuLinks())
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      saveHiddenMenuLinks([])
      return
    }

    let cancelled = false

    const loadPreference = async () => {
      try {
        const preference = await getTenantPreferences()
        if (!cancelled) {
          setHiddenMenuLinks(preference.hiddenMenuLinks)
          saveHiddenMenuLinks(preference.hiddenMenuLinks)
        }
      } catch {
        if (!cancelled) {
          setHiddenMenuLinks([])
          saveHiddenMenuLinks([])
        }
      }
    }

    void loadPreference()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const visibleNavigationSections = useMemo(
    () => navigationSections
      .map((section) => ({
        ...section,
        links: section.links.filter((link) => !hiddenMenuLinks.includes(link.to)),
      }))
      .filter((section) => section.links.length > 0),
    [hiddenMenuLinks],
  )

  const handleLogout = async () => {
    await logout()
  }

  const pageTitle = t(routeTitleKeys[location.pathname] ?? 'app.workspaceTitle')

  const desktopDrawerWidth = isSidebarCollapsed ? collapsedDrawerWidth : drawerWidth

  const sidebar = (collapsed: boolean) => (
    <Box className={collapsed ? 'dashboard-sidebar-shell dashboard-sidebar-shell-collapsed' : 'dashboard-sidebar-shell'}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1.25 : 2.5, py: 2.5 }}>
        <Box className="brand-mark">
          <Box component="img" src="/favicon.svg" alt={t('app.brand')} sx={{ width: 28, height: 28 }} />
        </Box>
        {!collapsed ? (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
              {t('app.brand')}
            </Typography>
          </Box>
        ) : null}
      </Stack>

      <Divider />

      <Box sx={{ px: collapsed ? 1 : 1.5, py: 1.5 }}>
        {!collapsed ? <Typography className="sidebar-caption">{t('app.navigation')}</Typography> : null}
        <Stack spacing={1.5}>
          {visibleNavigationSections.map((section) => (
            <Box key={section.titleKey}>
              {!collapsed ? (
                <Typography
                  variant="overline"
                  sx={{
                    px: 1.5,
                    color: 'text.secondary',
                    letterSpacing: '0.12em',
                  }}
                >
                  {t(section.titleKey)}
                </Typography>
              ) : null}
              <List disablePadding>
                {section.links.map((link) => {
                  const sectionAccentClass = getSectionAccentClass(section.titleKey)
                  const navItem = (
                    <ListItemButton
                      key={link.to}
                      component={NavLink}
                      to={link.to}
                      selected={location.pathname === link.to}
                      onClick={() => setMobileOpen(false)}
                      className={location.pathname === link.to ? `dashboard-nav-item dashboard-nav-item-active ${sectionAccentClass}` : `dashboard-nav-item ${sectionAccentClass}`}
                      sx={{ justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1.25 : 2 }}
                    >
                        <ListItemIcon className={collapsed ? 'dashboard-nav-icon-slot dashboard-nav-icon-slot-collapsed' : 'dashboard-nav-icon-slot'} sx={{ justifyContent: 'center' }}>{link.icon}</ListItemIcon>
                      {!collapsed ? <ListItemText primary={t(link.labelKey)} /> : null}
                    </ListItemButton>
                  )

                  if (!collapsed) {
                    return navItem
                  }

                  return (
                    <Tooltip key={link.to} title={t(link.labelKey)} placement="right" arrow>
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
                {isAuthenticated && user ? user.firstName ?? user.userName : t('app.anonymousMode')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {isAuthenticated && user ? user.email : t('app.signInHint')}
              </Typography>
            </>
          ) : null}
          {isAuthenticated ? (
            collapsed ? (
              <IconButton color="primary" onClick={() => void handleLogout()} aria-label={t('app.logout')} sx={{ width: '100%' }}>
                <LogoutRoundedIcon />
              </IconButton>
            ) : (
              <Button fullWidth variant="contained" startIcon={<LogoutRoundedIcon />} onClick={() => void handleLogout()}>
                {t('app.logout')}
              </Button>
            )
          ) : (
            collapsed ? <Chip size="small" label="P" variant="outlined" /> : <Chip label={t('app.publicAccessOnly')} variant="outlined" />
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
              onChange={(event) => handleThemeModeChange(event.target.value as 'light' | 'dark')}
              aria-label={t('app.themeSelectorAria')}
              sx={{ minWidth: 120, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <MenuItem value="light">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <LightModeRoundedIcon fontSize="small" />
                  <span>{t('app.themeLight')}</span>
                </Stack>
              </MenuItem>
              <MenuItem value="dark">
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <DarkModeRoundedIcon fontSize="small" />
                  <span>{t('app.themeDark')}</span>
                </Stack>
              </MenuItem>
            </Select>
            <IconButton
              size="small"
              onClick={toggleThemeMode}
              aria-label={themeMode === 'light' ? `${t('app.themeSelectorAria')}: ${t('app.themeDark')}` : `${t('app.themeSelectorAria')}: ${t('app.themeLight')}`}
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              {themeMode === 'light' ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
            </IconButton>
            <Select
              size="small"
              value={currentLanguage}
              onChange={(event) => handleLanguageChange(event.target.value as TranslationLanguage)}
              aria-label={t('app.languageSelectorAria')}
              sx={{ minWidth: 132 }}
            >
              {LanguageOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {t(option.translationKey)}
                </MenuItem>
              ))}
            </Select>
            {isAuthenticated ? (
              <Chip color="secondary" label={user ? `${user.firstName ?? user.userName} · ${user.roles[0] ?? 'User'}` : t('app.signedIn')} />
            ) : (
              <Chip label={t('app.publicRoute')} variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <IconButton
              sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
              onClick={toggleSidebarCollapsed}
              aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ mr: 'auto', minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                {t('app.adminConsole')}
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