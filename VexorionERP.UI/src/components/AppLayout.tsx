import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
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
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'

const drawerWidth = 280

const links = [
  { to: '/', label: 'Dashboard', icon: <DashboardRoundedIcon /> },
  { to: '/customers', label: 'Customers', icon: <Groups2RoundedIcon /> },
  { to: '/products', label: 'Products', icon: <Inventory2RoundedIcon /> },
  { to: '/purchase-orders', label: 'Purchase orders', icon: <ReceiptLongRoundedIcon /> },
  { to: '/sales-orders', label: 'Sales orders', icon: <ReceiptLongRoundedIcon /> },
  { to: '/suppliers', label: 'Suppliers', icon: <Groups2RoundedIcon /> },
  { to: '/tenants', label: 'Tenants', icon: <ApartmentRoundedIcon /> },
  { to: '/warehouses', label: 'Warehouses', icon: <WarehouseRoundedIcon /> },
  { to: '/login', label: 'Auth', icon: <LoginRoundedIcon /> },
]

const routeTitles: Record<string, string> = {
  '/': 'Overview',
  '/customers': 'Customers',
  '/products': 'Products',
  '/purchase-orders': 'Purchase Orders',
  '/sales-orders': 'Sales Orders',
  '/suppliers': 'Suppliers',
  '/tenants': 'Tenant onboarding',
  '/warehouses': 'Warehouses',
  '/login': 'Authentication',
}

export default function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  const pageTitle = routeTitles[location.pathname] ?? 'Workspace'

  const sidebar = (
    <Box className="dashboard-sidebar-shell">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2.5, py: 2.5 }}>
        <Box className="brand-mark">
          <AutoGraphRoundedIcon />
        </Box>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
            VEXORION ERP
          </Typography>
          <Typography variant="h6">CRUD workspace</Typography>
        </Box>
      </Stack>

      <Divider />

      <Box sx={{ px: 1.5, py: 1.5 }}>
        <Typography className="sidebar-caption">Navigation</Typography>
        <List disablePadding>
          {links.map((link) => (
            <ListItemButton
              key={link.to}
              component={NavLink}
              to={link.to}
              selected={location.pathname === link.to}
              onClick={() => setMobileOpen(false)}
              className={location.pathname === link.to ? 'dashboard-nav-item dashboard-nav-item-active' : 'dashboard-nav-item'}
            >
              <ListItemIcon>{link.icon}</ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', px: 2, pb: 2 }}>
        <Paper elevation={0} className="sidebar-footer-card">
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {isAuthenticated && user ? user.firstName ?? user.userName : 'Anonymous mode'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {isAuthenticated && user ? user.email : 'Sign in to unlock protected modules.'}
          </Typography>
          {isAuthenticated ? (
            <Button fullWidth variant="contained" startIcon={<LogoutRoundedIcon />} onClick={() => void handleLogout()}>
              Logout
            </Button>
          ) : (
            <Chip label="Public access only" variant="outlined" />
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
        <Toolbar className="dashboard-topbar">
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ mr: 'auto' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                Admin console
              </Typography>
              <Typography variant="h5">{pageTitle}</Typography>
            </Box>
            {isAuthenticated ? (
              <Chip color="secondary" label={user ? `${user.firstName ?? user.userName} · ${user.roles[0] ?? 'User'}` : 'Signed in'} />
            ) : (
              <Chip label="Public route" variant="outlined" />
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