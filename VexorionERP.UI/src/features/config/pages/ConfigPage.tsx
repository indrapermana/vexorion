import { OpenInNewRoundedIcon } from '@vexorion/ui'
import { VxBox, VxIconButton, VxPaper, VxStack, VxTooltip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../../app/AuthContext'
import { canAccessMainRoute } from '../../../app/authorization'

const configCards = [
  {
    titleKey: 'configCenter.cards.users.title',
    descriptionKey: 'configCenter.cards.users.description',
    to: '/config/users',
    accent: '#0f766e',
  },
  {
    titleKey: 'configCenter.cards.roles.title',
    descriptionKey: 'configCenter.cards.roles.description',
    to: '/config/roles',
    accent: '#1d4ed8',
  },
  {
    titleKey: 'configCenter.cards.menu.title',
    descriptionKey: 'configCenter.cards.menu.description',
    to: '/config/menu',
    accent: '#6d28d9',
  },
  {
    titleKey: 'configCenter.cards.taxDiscount.title',
    descriptionKey: 'configCenter.cards.taxDiscount.description',
    to: '/config/tax-discount',
    accent: '#b45309',
  },
  {
    titleKey: 'configCenter.cards.company.title',
    descriptionKey: 'configCenter.cards.company.description',
    to: '/config/company',
    accent: '#be123c',
  },
  {
    titleKey: 'configCenter.cards.productCategories.title',
    descriptionKey: 'configCenter.cards.productCategories.description',
    to: '/config/product-categories',
    accent: '#0e7490',
  },
  {
    titleKey: 'configCenter.cards.importData.title',
    descriptionKey: 'configCenter.cards.importData.description',
    to: '/config/import-data',
    accent: '#4f46e5',
  },
]

export default function ConfigPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const accessibleCards = configCards.filter((card) => canAccessMainRoute(user?.permissions, card.to))

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h4" sx={{ mb: 1 }}>{t('configCenter.title')}</VxTypography>
        <VxTypography color="text.secondary">
          {t('configCenter.subtitle')}
        </VxTypography>
      </VxPaper>

      <VxBox
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {accessibleCards.map((item) => (
          <VxPaper
            key={item.to}
            elevation={0}
            className="panel-card"
            sx={{
              p: 2,
              borderLeft: `4px solid ${item.accent}`,
              minHeight: 150,
            }}
          >
            <VxStack spacing={1.5} sx={{ height: '100%' }}>
              <VxStack direction="row" sx={{ alignItems: 'start', justifyContent: 'space-between' }}>
                <VxTypography variant="h6" sx={{ fontSize: '1.02rem', pr: 1 }}>{t(item.titleKey)}</VxTypography>
                <VxTooltip title={t('configCenter.openSetting')}>
                  <VxIconButton
                    component={RouterLink}
                    to={item.to}
                    size="small"
                    aria-label={`${t('configCenter.openSetting')} ${t(item.titleKey)}`}
                    sx={{ mt: -0.5, mr: -0.5 }}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </VxIconButton>
                </VxTooltip>
              </VxStack>
              <VxTypography variant="body2" color="text.secondary">{t(item.descriptionKey)}</VxTypography>
            </VxStack>
          </VxPaper>
        ))}
      </VxBox>
    </VxStack>
  )
}
