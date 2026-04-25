import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import ShieldMoonRoundedIcon from '@mui/icons-material/ShieldMoonRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'

const pageContent: Record<string, { eyebrow: string; title: string; description: string; cta: string }> = {
  '/login': {
    eyebrow: 'Access workspace',
    title: 'Sign in to the ERP control plane.',
    description:
      'Authenticate against the ASP.NET Core API, restore your session automatically, and enter the protected CRUD workspace.',
    cta: 'JWT login, refresh flow, and guarded routes are already wired.',
  },
  '/tenants': {
    eyebrow: 'Launch new tenant',
    title: 'Create a tenant and bootstrap the first admin account.',
    description:
      'Use the public onboarding flow to provision a fresh ERP workspace with tenant, company, and initial administrator details.',
    cta: 'This stays outside the admin shell by design so first-run setup feels distinct.',
  },
}

const featureRows = [
  {
    icon: <ShieldMoonRoundedIcon />,
    title: 'Session resilience',
    description: 'Access tokens are refreshed automatically and protected routes redirect cleanly when a session expires.',
  },
  {
    icon: <StorefrontRoundedIcon />,
    title: 'Operational modules',
    description: 'Catalog, inventory, sales, purchasing, billing, and tenant provisioning are already aligned behind the same API boundary.',
  },
  {
    icon: <TrendingUpRoundedIcon />,
    title: 'Admin-first UI',
    description: 'The main shell has moved to a left-nav CRUD dashboard, while public entry flows keep a dedicated conversion-oriented layout.',
  },
]

export default function PublicAuthLayout() {
  const location = useLocation()
  const content = pageContent[location.pathname] ?? pageContent['/login']

  return (
    <Box className="public-shell">
      <Box className="public-shell__panel public-shell__panel--content">
        <Stack spacing={3} className="public-shell__content">
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box className="brand-mark">
              <AutoGraphRoundedIcon />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.18em' }}>
                VEXORION ERP
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>Workspace access</Typography>
            </Box>
          </Stack>

          <Box>
            <Typography className="public-shell__eyebrow">{content.eyebrow}</Typography>
            <Typography variant="h2" className="public-shell__title">{content.title}</Typography>
            <Typography className="public-shell__description">{content.description}</Typography>
          </Box>

          <Chip
            icon={<ApartmentRoundedIcon />}
            label={content.cta}
            className="public-shell__chip"
          />

          <Stack spacing={2.25}>
            {featureRows.map((feature) => (
              <Box key={feature.title} className="public-feature-row">
                <Box className="public-feature-row__icon">{feature.icon}</Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                    {feature.title}
                  </Typography>
                  <Typography className="public-feature-row__description">{feature.description}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      <Box className="public-shell__panel public-shell__panel--form">
        <Box className="public-shell__form-wrap">
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}