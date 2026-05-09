import { ApartmentRoundedIcon, AutoGraphRoundedIcon, ShieldMoonRoundedIcon, StorefrontRoundedIcon, TrendingUpRoundedIcon } from '@vexorion/ui'
import { VxBox, VxChip, VxStack, VxTypography } from '@vexorion/ui'
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
    <VxBox className="public-shell">
      <VxBox className="public-shell__panel public-shell__panel--content">
        <VxStack spacing={3} className="public-shell__content">
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <VxBox className="brand-mark">
              <AutoGraphRoundedIcon />
            </VxBox>
            <VxBox>
              <VxTypography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.18em' }}>
                {t('app.brand')}
              </VxTypography>
              <VxTypography variant="h6" sx={{ color: '#fff' }}>{t('publicAuth.workspaceAccess')}</VxTypography>
            </VxBox>
          </VxStack>

          <VxBox>
            <VxTypography className="public-shell__eyebrow">{content.eyebrow}</VxTypography>
            <VxTypography variant="h2" className="public-shell__title">{content.title}</VxTypography>
            <VxTypography className="public-shell__description">{content.description}</VxTypography>
          </VxBox>

          <VxChip
            icon={<ApartmentRoundedIcon />}
            label={content.cta}
            className="public-shell__chip"
          />

          <VxStack spacing={2.25}>
            {featureRows.map((feature) => (
              <VxBox key={feature.title} className="public-feature-row">
                <VxBox className="public-feature-row__icon">{feature.icon}</VxBox>
                <VxBox>
                  <VxTypography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                    {feature.title}
                  </VxTypography>
                  <VxTypography className="public-feature-row__description">{feature.description}</VxTypography>
                </VxBox>
              </VxBox>
            ))}
          </VxStack>
        </VxStack>
      </VxBox>

      <VxBox className="public-shell__panel public-shell__panel--form">
        <VxBox className="public-shell__form-wrap">
          <Outlet />
        </VxBox>
      </VxBox>
    </VxBox>
  )
}