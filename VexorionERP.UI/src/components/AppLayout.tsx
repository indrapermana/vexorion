import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import RuleRoundedIcon from '@mui/icons-material/RuleRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
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
      { to: '/customers', labelKey: 'nav.links.customers', icon: <Groups2RoundedIcon /> },
      { to: '/sales-orders', labelKey: 'nav.links.salesOrders', icon: <ReceiptLongRoundedIcon /> },
      { to: '/sales-shipments', labelKey: 'nav.links.salesShipments', icon: <ReceiptLongRoundedIcon /> },
      { to: '/sales-invoices', labelKey: 'nav.links.salesInvoices', icon: <ReceiptLongRoundedIcon /> },
      { to: '/customer-payments', labelKey: 'nav.links.customerPayments', icon: <ReceiptLongRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.procurement',
    links: [
      { to: '/suppliers', labelKey: 'nav.links.suppliers', icon: <Groups2RoundedIcon /> },
      { to: '/purchase-orders', labelKey: 'nav.links.purchaseOrders', icon: <ReceiptLongRoundedIcon /> },
      { to: '/purchase-receipts', labelKey: 'nav.links.purchaseReceipts', icon: <ReceiptLongRoundedIcon /> },
      { to: '/purchase-invoices', labelKey: 'nav.links.purchaseInvoices', icon: <ReceiptLongRoundedIcon /> },
      { to: '/vendor-payments', labelKey: 'nav.links.vendorPayments', icon: <ReceiptLongRoundedIcon /> },
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
      { to: '/accounts', labelKey: 'nav.links.accounts', icon: <AutoGraphRoundedIcon /> },
      { to: '/audit-logs', labelKey: 'nav.links.auditLogs', icon: <AutoGraphRoundedIcon /> },
      { to: '/fiscal-periods', labelKey: 'nav.links.fiscalPeriods', icon: <AutoGraphRoundedIcon /> },
      { to: '/journals', labelKey: 'nav.links.journals', icon: <AutoGraphRoundedIcon /> },
      { to: '/reports', labelKey: 'nav.links.reports', icon: <AutoGraphRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.sections.configuration',
    links: [
      { to: '/config', labelKey: 'nav.links.configCenter', icon: <SettingsRoundedIcon /> },
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

  useEffect(() => {
    setHiddenMenuLinks(getHiddenMenuLinks())
    return subscribeToMenuConfigChange(() => {
      setHiddenMenuLinks(getHiddenMenuLinks())
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setHiddenMenuLinks([])
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

  const sidebar = (
    <Box className="dashboard-sidebar-shell">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2.5, py: 2.5 }}>
        <Box className="brand-mark">
          <AutoGraphRoundedIcon />
        </Box>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
            {t('app.brand')}
          </Typography>
          <Typography variant="h6">{t('app.workspace')}</Typography>
        </Box>
      </Stack>

      <Divider />

      <Box sx={{ px: 1.5, py: 1.5 }}>
        <Typography className="sidebar-caption">{t('app.navigation')}</Typography>
        <Stack spacing={1.5}>
          {visibleNavigationSections.map((section) => (
            <Box key={section.titleKey}>
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
              <List disablePadding>
                {section.links.map((link) => (
                  <ListItemButton
                    key={link.to}
                    component={NavLink}
                    to={link.to}
                    selected={location.pathname === link.to}
                    onClick={() => setMobileOpen(false)}
                    className={location.pathname === link.to ? 'dashboard-nav-item dashboard-nav-item-active' : 'dashboard-nav-item'}
                  >
                    <ListItemIcon>{link.icon}</ListItemIcon>
                    <ListItemText primary={t(link.labelKey)} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 'auto', px: 2, pb: 2 }}>
        <Paper elevation={0} className="sidebar-footer-card">
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {isAuthenticated && user ? user.firstName ?? user.userName : t('app.anonymousMode')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {isAuthenticated && user ? user.email : t('app.signInHint')}
          </Typography>
          {isAuthenticated ? (
            <Button fullWidth variant="contained" startIcon={<LogoutRoundedIcon />} onClick={() => void handleLogout()}>
              {t('app.logout')}
            </Button>
          ) : (
            <Chip label={t('app.publicAccessOnly')} variant="outlined" />
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
        {sidebar}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 'none' },
        }}
      >
        {sidebar}
      </Drawer>

      <Box className="dashboard-main" sx={{ ml: { lg: `${drawerWidth}px` } }}>
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
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ mr: 'auto' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                {t('app.adminConsole')}
              </Typography>
              <Typography variant="h5">{pageTitle}</Typography>
            </Box>
            {isAuthenticated ? (
              <Chip color="secondary" label={user ? `${user.firstName ?? user.userName} · ${user.roles[0] ?? 'User'}` : t('app.signedIn')} />
            ) : (
              <Chip label={t('app.publicRoute')} variant="outlined" />
            )}
          </Stack>
        </Toolbar>

        <Box className="dashboard-content">
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}