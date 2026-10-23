import { ApartmentRoundedIcon, ShieldMoonRoundedIcon, StorefrontRoundedIcon, TrendingUpRoundedIcon } from '@vexorion/ui'
import { VxBox, VxChip, VxStack, VxTypography } from '@vexorion/ui'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PublicAuthLayout() {
  const { t } = useTranslation()
  const features = [
    {
      icon: <ShieldMoonRoundedIcon />,
      title: t('publicAuth.secureTitle'),
      description: t('publicAuth.secureDescription'),
    },
    {
      icon: <StorefrontRoundedIcon />,
      title: t('publicAuth.operationsTitle'),
      description: t('publicAuth.operationsDescription'),
    },
    {
      icon: <TrendingUpRoundedIcon />,
      title: t('publicAuth.visibilityTitle'),
      description: t('publicAuth.visibilityDescription'),
    },
  ]

  return (
    <VxBox className="public-shell">
      <VxBox className="public-shell__panel public-shell__panel--content">
        <VxStack spacing={3} className="public-shell__content">
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <VxBox className="brand-mark">
              <VxBox component="img" src="/favicon.svg" alt="Vexorion" sx={{ width: 28, height: 28 }} />
            </VxBox>
            <VxBox>
              <VxTypography variant="overline" sx={{ color: '#ffffff', letterSpacing: '0.18em' }}>
                {t('shell.brand')}
              </VxTypography>
              <VxTypography component="p" variant="h6" sx={{ color: '#fff' }}>{t('publicAuth.workspace')}</VxTypography>
            </VxBox>
          </VxStack>

          <VxBox>
            <VxTypography className="public-shell__eyebrow">{t('publicAuth.eyebrow')}</VxTypography>
            <VxTypography component="p" variant="h2" className="public-shell__title">{t('publicAuth.title')}</VxTypography>
            <VxTypography className="public-shell__description">
              {t('publicAuth.description')}
            </VxTypography>
          </VxBox>

          <VxChip
            icon={<ApartmentRoundedIcon />}
            label={t('publicAuth.developmentHint')}
            className="public-shell__chip"
          />

          <VxStack spacing={2.25}>
            {features.map((feature) => (
              <VxBox key={feature.title} className="public-feature-row">
                <VxBox className="public-feature-row__icon">{feature.icon}</VxBox>
                <VxBox>
                  <VxTypography component="p" variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
                    {feature.title}
                  </VxTypography>
                  <VxTypography className="public-feature-row__description">{feature.description}</VxTypography>
                </VxBox>
              </VxBox>
            ))}
          </VxStack>
        </VxStack>
      </VxBox>

      <VxBox component="main" className="public-shell__panel public-shell__panel--form">
        <VxBox className="public-shell__form-wrap">
          <Outlet />
        </VxBox>
      </VxBox>
    </VxBox>
  )
}
