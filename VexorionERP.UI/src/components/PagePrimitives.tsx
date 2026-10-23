import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  VxAlert,
  VxBox,
  VxButton,
  VxCircularProgress,
  VxPaper,
  VxStack,
  VxTypography,
} from '@vexorion/ui'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  primaryAction?: ReactNode
  filters?: ReactNode
  metrics?: ReactNode
}

export function PageHeader({ title, description, primaryAction, filters, metrics }: PageHeaderProps) {
  const { t } = useTranslation()
  return (
    <VxPaper component="header" elevation={0} className="panel-card">
      <VxStack spacing={2.5}>
        <VxStack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <VxBox sx={{ minWidth: 0 }}>
            <VxTypography component="h1" variant="h4" sx={{ mb: description ? 1 : 0, overflowWrap: 'anywhere' }}>
              {title}
            </VxTypography>
            {description ? <VxTypography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{description}</VxTypography> : null}
          </VxBox>
          {primaryAction ? <VxBox sx={{ flexShrink: 0 }}>{primaryAction}</VxBox> : null}
        </VxStack>

        {filters ? (
          <VxBox component="section" aria-label={t('common.pageFilters')}>
            {filters}
          </VxBox>
        ) : null}

        {metrics ? (
          <VxBox
            component="section"
            aria-label={t('common.pageMetrics')}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
              gap: 1.5,
            }}
          >
            {metrics}
          </VxBox>
        ) : null}
      </VxStack>
    </VxPaper>
  )
}

type PageMetricProps = {
  icon?: ReactNode
  label: ReactNode
  value: ReactNode
}

export function PageMetric({ icon, label, value }: PageMetricProps) {
  return (
    <VxPaper elevation={0} className="products-metric-card" sx={{ minWidth: 0, flex: 1 }}>
      {icon}
      <VxBox sx={{ minWidth: 0 }}>
        <VxTypography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {label}
        </VxTypography>
        <VxTypography component="p" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{value}</VxTypography>
      </VxBox>
    </VxPaper>
  )
}

type PageFeedbackProps = {
  error?: ReactNode
  success?: ReactNode
  info?: ReactNode
  retryLabel?: ReactNode
  onRetry?: () => void
}

export function PageFeedback({ error, success, info, retryLabel, onRetry }: PageFeedbackProps) {
  const { t } = useTranslation()
  const resolvedRetryLabel = retryLabel ?? t('common.retry')
  if (!error && !success && !info) {
    return null
  }

  return (
    <VxStack spacing={1.5}>
      {error ? (
        <VxAlert
          severity="error"
          role="alert"
          action={onRetry ? <VxButton color="inherit" size="small" onClick={onRetry}>{resolvedRetryLabel}</VxButton> : undefined}
        >
          {error}
        </VxAlert>
      ) : null}
      {success ? <VxAlert severity="success" role="status">{success}</VxAlert> : null}
      {info ? <VxAlert severity="info" role="status">{info}</VxAlert> : null}
    </VxStack>
  )
}

type PageBodyProps = {
  children: ReactNode
  labelledBy?: string
}

export function PageBody({ children, labelledBy }: PageBodyProps) {
  return (
    <VxPaper
      component="section"
      aria-labelledby={labelledBy}
      elevation={0}
      className="panel-card products-grid-panel"
      sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}
    >
      {children}
    </VxPaper>
  )
}

type PageLoadingStateProps = {
  label: ReactNode
  minHeight?: number
}

export function PageLoadingState({ label, minHeight = 180 }: PageLoadingStateProps) {
  return (
    <VxBox role="status" sx={{ display: 'grid', placeItems: 'center', minHeight }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VxCircularProgress size={28} />
        <VxTypography color="text.secondary">{label}</VxTypography>
      </VxStack>
    </VxBox>
  )
}

type PageEmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export function PageEmptyState({ title, description, action }: PageEmptyStateProps) {
  return (
    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180, px: 2, textAlign: 'center' }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center', maxWidth: 520 }}>
        <VxTypography component="h2" variant="h6">{title}</VxTypography>
        {description ? <VxTypography color="text.secondary">{description}</VxTypography> : null}
        {action}
      </VxStack>
    </VxBox>
  )
}

type PageErrorStateProps = {
  title: ReactNode
  description?: ReactNode
  retryLabel?: ReactNode
  onRetry?: () => void
}

export function PageErrorState({ title, description, retryLabel = 'Retry', onRetry }: PageErrorStateProps) {
  return (
    <VxBox role="alert" sx={{ display: 'grid', placeItems: 'center', minHeight: 180, px: 2, textAlign: 'center' }}>
      <VxStack spacing={1.5} sx={{ alignItems: 'center', maxWidth: 520 }}>
        <VxTypography component="h2" variant="h6">{title}</VxTypography>
        {description ? <VxTypography color="text.secondary">{description}</VxTypography> : null}
        {onRetry ? <VxButton variant="outlined" onClick={onRetry}>{retryLabel}</VxButton> : null}
      </VxStack>
    </VxBox>
  )
}
