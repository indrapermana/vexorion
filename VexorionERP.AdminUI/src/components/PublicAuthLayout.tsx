import { ApartmentRoundedIcon, ShieldMoonRoundedIcon, StorefrontRoundedIcon, TrendingUpRoundedIcon } from '@vexorion/ui'
import { VxBox, VxChip, VxStack, VxTypography } from '@vexorion/ui'
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
    <VxBox className="public-shell">
      <VxBox className="public-shell__panel public-shell__panel--content">
        <VxStack spacing={3} className="public-shell__content">
          <VxStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <VxBox className="brand-mark">
              <VxBox component="img" src="/favicon.svg" alt="Vexorion" sx={{ width: 28, height: 28 }} />
            </VxBox>
            <VxBox>
              <VxTypography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.18em' }}>
                VEXORION ERP
              </VxTypography>
              <VxTypography variant="h6" sx={{ color: '#fff' }}>System Admin Workspace</VxTypography>
            </VxBox>
          </VxStack>

          <VxBox>
            <VxTypography className="public-shell__eyebrow">Admin Portal</VxTypography>
            <VxTypography variant="h2" className="public-shell__title">Control all tenant workspaces from one place.</VxTypography>
            <VxTypography className="public-shell__description">
              Sign in with SystemAdmin credentials to manage tenants, users, and tenant menu configuration safely outside the tenant app.
            </VxTypography>
          </VxBox>

          <VxChip
            icon={<ApartmentRoundedIcon />}
            label="Use tenant code demo for seeded development account"
            className="public-shell__chip"
          />

          <VxStack spacing={2.25}>
            {features.map((feature) => (
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
