import { ReportGmailerrorredRoundedIcon } from '@vexorion/ui'
import { Button, Chip, Paper, Stack, Typography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import type { NotFoundPageProps } from '../types/ui'

export default function NotFoundPage({
  variant = 'admin',
  backTo = variant === 'public' ? '/login' : '/',
  backLabel = variant === 'public' ? 'Back to sign in' : 'Back to dashboard',
}: NotFoundPageProps) {
  const { t } = useTranslation()
  const isPublic = variant === 'public'

  return (
    <Paper elevation={0} className={isPublic ? 'public-form-card public-not-found-card' : 'panel-card admin-not-found-card'}>
      <Stack spacing={2.25}>
        <Chip
          icon={<ReportGmailerrorredRoundedIcon />}
          label={isPublic ? t('pages.notFound.publicRouteNotFound') : t('pages.notFound.adminRouteNotFound')}
          color="secondary"
          sx={{ alignSelf: 'flex-start' }}
        />
        <Typography variant="h2">{t('pages.notFound.title')}</Typography>
        <Typography color="text.secondary">
          {isPublic
            ? t('pages.notFound.publicDescription')
            : t('pages.notFound.adminDescription')}
        </Typography>
        <Button component={RouterLink} to={backTo} variant="contained">{backLabel}</Button>
      </Stack>
    </Paper>
  )
}