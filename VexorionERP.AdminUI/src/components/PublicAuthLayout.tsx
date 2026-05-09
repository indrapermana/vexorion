import { ApartmentRoundedIcon, ShieldMoonRoundedIcon, StorefrontRoundedIcon, TrendingUpRoundedIcon } from '@vexorion/ui'
import { Box, Chip, Stack, Typography } from '@vexorion/ui'
import { Outlet } from 'react-router-dom'

export default function PublicAuthLayout() {
  const features = [
    {
      icon: <ShieldMoonRoundedIcon />,
      title: 'Secure session controls',
      description: 'Token refresh and role based access are enforced for admin-only workflows.',
    },
    {
      icon: <StorefrontRoundedIcon />,
      title: 'Centralized tenant operations',
      description: 'Manage tenants, users, and menu controls from one isolated admin workspace.',
    },
    {
      icon: <TrendingUpRoundedIcon />,
      title: 'Operational visibility',
      description: 'Track tenant growth and user activity with dashboard-level indicators.',
    },
  ]

  return (
    <Box className="public-shell">
      <Box className="public-shell__panel public-shell__panel--content">
        <Stack spacing={3} className="public-shell__content">
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box className="brand-mark">
              <Box component="img" src="/favicon.svg" alt="Vexorion" sx={{ width: 28, height: 28 }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.18em' }}>
                VEXORION ERP
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>System Admin Workspace</Typography>
            </Box>
          </Stack>

          <Box>
            <Typography className="public-shell__eyebrow">Admin Portal</Typography>
            <Typography variant="h2" className="public-shell__title">Control all tenant workspaces from one place.</Typography>
            <Typography className="public-shell__description">
              Sign in with SystemAdmin credentials to manage tenants, users, and tenant menu configuration safely outside the tenant app.
            </Typography>
          </Box>

          <Chip
            icon={<ApartmentRoundedIcon />}
            label="Use tenant code demo for seeded development account"
            className="public-shell__chip"
          />

          <Stack spacing={2.25}>
            {features.map((feature) => (
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
