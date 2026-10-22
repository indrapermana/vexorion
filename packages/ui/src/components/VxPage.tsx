import type { ReactNode } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxPaper, VxStack, VxTypography } from './material'

export function VxPageHeader({ title, description, action, filters }: { title: ReactNode; description?: ReactNode; action?: ReactNode; filters?: ReactNode }) {
  return <VxPaper component="header" elevation={0} className="panel-card hero-panel" sx={{ p: 2.5 }}>
    <VxStack spacing={2}>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
        <VxBox sx={{ minWidth: 0 }}><VxTypography component="h1" variant="h4" sx={{ mb: description ? 1 : 0 }}>{title}</VxTypography>{description ? <VxTypography color="text.secondary">{description}</VxTypography> : null}</VxBox>
        {action ? <VxBox sx={{ flexShrink: 0 }}>{action}</VxBox> : null}
      </VxStack>
      {filters ? <VxBox component="section" aria-label="Page filters">{filters}</VxBox> : null}
    </VxStack>
  </VxPaper>
}

export function VxPageFeedback({ error, success, info, onRetry }: { error?: ReactNode; success?: ReactNode; info?: ReactNode; onRetry?: () => void }) {
  if (!error && !success && !info) return null
  return <VxStack spacing={1.5} aria-live="polite">
    {error ? <VxAlert severity="error" action={onRetry ? <VxButton color="inherit" size="small" onClick={onRetry}>Retry</VxButton> : undefined}>{error}</VxAlert> : null}
    {success ? <VxAlert severity="success">{success}</VxAlert> : null}
    {info ? <VxAlert severity="info">{info}</VxAlert> : null}
  </VxStack>
}

export function VxPageBody({ children }: { children: ReactNode }) {
  return <VxPaper component="section" elevation={0} className="panel-card products-grid-panel" sx={{ p: 2, minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>{children}</VxPaper>
}

export function VxPageLoading({ label = 'Loading...' }: { label?: ReactNode }) {
  return <VxBox role="status" sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}><VxStack spacing={1.5} sx={{ alignItems: 'center' }}><VxCircularProgress size={28} /><VxTypography color="text.secondary">{label}</VxTypography></VxStack></VxBox>
}
