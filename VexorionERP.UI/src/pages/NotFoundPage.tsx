import { ReportGmailerrorredRoundedIcon } from '@vexorion/ui'
import { VxButton, VxChip, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
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
    <VxPaper elevation={0} className={isPublic ? 'public-form-card public-not-found-card' : 'panel-card admin-not-found-card'}>
      <VxStack spacing={2.25}>
        <VxChip
          icon={<ReportGmailerrorredRoundedIcon />}
          label={isPublic ? t('pages.notFound.publicRouteNotFound') : t('pages.notFound.adminRouteNotFound')}
          color="secondary"
          sx={{ alignSelf: 'flex-start' }}
        />
        <VxTypography variant="h2">{t('pages.notFound.title')}</VxTypography>
        <VxTypography color="text.secondary">
          {isPublic
            ? t('pages.notFound.publicDescription')
            : t('pages.notFound.adminDescription')}
        </VxTypography>
        <VxButton component={RouterLink} to={backTo} variant="contained">{backLabel}</VxButton>
      </VxStack>
    </VxPaper>
  )
}