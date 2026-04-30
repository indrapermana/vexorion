import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'

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
]

export default function ConfigPage() {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('configCenter.title')}</Typography>
        <Typography color="text.secondary">
          {t('configCenter.subtitle')}
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {configCards.map((item) => (
          <Paper
            key={item.to}
            elevation={0}
            className="panel-card"
            sx={{
              p: 2,
              borderLeft: `4px solid ${item.accent}`,
              minHeight: 150,
            }}
          >
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Stack direction="row" sx={{ alignItems: 'start', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontSize: '1.02rem', pr: 1 }}>{t(item.titleKey)}</Typography>
                <Tooltip title={t('configCenter.openSetting')}>
                  <IconButton
                    component={RouterLink}
                    to={item.to}
                    size="small"
                    aria-label={`${t('configCenter.openSetting')} ${t(item.titleKey)}`}
                    sx={{ mt: -0.5, mr: -0.5 }}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary">{t(item.descriptionKey)}</Typography>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  )
}
