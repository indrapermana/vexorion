import type { ReactNode } from 'react'
import { VxAlert, VxButton, VxStack } from '@vexorion/ui'
import { PageBody, PageHeader, PageMetric } from './PagePrimitives'

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
  showCreate?: boolean
  filters?: ReactNode
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
  showCreate = true,
  filters,
  metrics,
  alerts = [],
  grid,
  linesPanel,
  documentsPanel,
  editor,
  deleteDialog,
}: OrderWorkspaceProps) {
  return (
    <VxStack spacing={3}>
      <PageHeader
        title={title}
        description={description}
        primaryAction={showCreate ? <VxButton variant="contained" onClick={onCreate} disabled={disableCreate}>{createLabel}</VxButton> : null}
        filters={filters}
        metrics={metrics.map((metric) => (
          <PageMetric key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} />
        ))}
      />

      {alerts.map((alert) => (
        <VxAlert
          key={`${alert.severity}:${alert.message}`}
          severity={alert.severity}
          role={alert.severity === 'error' ? 'alert' : 'status'}
        >
          {alert.message}
        </VxAlert>
      ))}

      <PageBody>
        {grid}
      </PageBody>

      {linesPanel}
      {documentsPanel}
      {editor}
      {deleteDialog}
    </VxStack>
  )
}
