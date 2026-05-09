import type { ReactNode } from 'react'
import { VxAlert, VxBox, VxButton, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type MetricCard = {
  icon: ReactNode
  label: string
  value: string | number
}

type OrderWorkspaceProps = {
  title: string
  description: string
  createLabel: string
  onCreate: () => void
  disableCreate?: boolean
  metrics: MetricCard[]
  alerts?: Array<{ severity: 'warning' | 'error' | 'success' | 'info', message: string }>
  grid: ReactNode
  linesPanel: ReactNode
  documentsPanel?: ReactNode
  editor?: ReactNode
  deleteDialog?: ReactNode
}

export default function OrderWorkspace({
  title,
  description,
  createLabel,
  onCreate,
  disableCreate,
  metrics,
  alerts = [],
  grid,
  linesPanel,
  documentsPanel,
  editor,
  deleteDialog,
}: OrderWorkspaceProps) {
  useTranslation()
  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{title}</VxTypography>
            <VxTypography color="text.secondary">{description}</VxTypography>
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <VxButton variant="contained" onClick={onCreate} disabled={disableCreate}>{createLabel}</VxButton>
            {metrics.map((metric) => (
              <VxPaper key={metric.label} elevation={0} className="products-metric-card">
                {metric.icon}
                <VxBox>
                  <VxTypography variant="body2" color="text.secondary">{metric.label}</VxTypography>
                  <VxTypography variant="h6">{metric.value}</VxTypography>
                </VxBox>
              </VxPaper>
            ))}
          </VxStack>
        </VxStack>
      </VxPaper>

      {alerts.map((alert) => <VxAlert key={`${alert.severity}:${alert.message}`} severity={alert.severity}>{alert.message}</VxAlert>)}

      <VxPaper elevation={0} className="panel-card products-grid-panel">
        {grid}
      </VxPaper>

      {linesPanel}
      {documentsPanel}
      {editor}
      {deleteDialog}
    </VxStack>
  )
}