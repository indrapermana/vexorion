import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import ShieldMoonRoundedIcon from '@mui/icons-material/ShieldMoonRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'

export default function PublicAuthLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const pageContent: Record<string, { eyebrow: string; title: string; description: string; cta: string }> = {
    '/login': {
      eyebrow: t('publicAuth.login.eyebrow'),
      title: t('publicAuth.login.title'),
      description: t('publicAuth.login.description'),
      cta: t('publicAuth.login.cta'),
    },
    '/tenants': {
      eyebrow: t('publicAuth.tenants.eyebrow'),
      title: t('publicAuth.tenants.title'),
      description: t('publicAuth.tenants.description'),
      cta: t('publicAuth.tenants.cta'),
    },
  }
  const featureRows = [
    {
      icon: <ShieldMoonRoundedIcon />,
      title: t('publicAuth.features.sessionResilience.title'),
      description: t('publicAuth.features.sessionResilience.description'),
    },
    {
      icon: <StorefrontRoundedIcon />,
      title: t('publicAuth.features.operationalModules.title'),
      description: t('publicAuth.features.operationalModules.description'),
    },
    {
      icon: <TrendingUpRoundedIcon />,
      title: t('publicAuth.features.adminFirstUi.title'),
      description: t('publicAuth.features.adminFirstUi.description'),
    },
  ]
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
                {t('app.brand')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>{t('publicAuth.workspaceAccess')}</Typography>
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